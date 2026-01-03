
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { verifyIapToken, getCurrentUser } from '@/lib/auth';
import { google } from 'googleapis';
import { appendLog } from '@/lib/sheets';

const SHEET_ID = '1WDJvweOGdqOkZjkR6yyMYtnRxaJUvxrF1TFHkzLpmAQ';

export async function POST(request: Request) {
    try {
        // 1. Auth Check (omitted context)
        const headersList = await headers();
        const iapJwt = headersList.get("x-goog-iap-jwt-assertion") || "";
        const email = await verifyIapToken(iapJwt);

        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await getCurrentUser(email);
        if (!currentUser || currentUser.employment_status !== "正職員") {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const guests = body.guests; // Array of guest objects

        // 2. Process each guest
        // Need to use transaction to ensure serial numbers are unique
        const result = await db.runTransaction(async (transaction) => {
            // Read "counters" document or find latest user to determine sequence
            // Ideally we should have a collection `system_settings` -> `sequence`
            const seqRef = db.collection('system_settings').doc('sequence');
            const seqDoc = await transaction.get(seqRef);

            let currentSeq = 0;
            if (seqDoc.exists) {
                currentSeq = seqDoc.data()?.guest_sequence || 0;
            }

            const newGuestsData = [];

            for (const guest of guests) {
                // Validation: Check usage limit (3 months)
                const expDate = new Date(guest.expiration_date);
                const limitDate = new Date();
                limitDate.setMonth(limitDate.getMonth() + 3);
                // Reset limit time to end of day to be generous? Or simple comparison.
                // Simple comparison: if expDate > limitDate
                if (expDate > limitDate) {
                    throw new Error(`利用期限が3ヶ月の上限を超えています: ${guest.last_name} ${guest.first_name} (${guest.expiration_date})`);
                }

                currentSeq++;
                const seqStr = String(currentSeq).padStart(4, '0');
                const newEmail = `gst-${seqStr}@ogw3.com`;

                // Data for Firestore
                const guestData = {
                    id: newEmail,
                    last_name: guest.last_name,
                    first_name: guest.first_name,
                    department: guest.department,
                    usage_purpose: guest.usage_purpose,
                    approver_id: guest.approver_email,
                    expiration_date: Timestamp.fromDate(expDate),
                    status: "利用中",
                    requested_expiration_date: null,
                    last_updated_date: Timestamp.now(),
                    created_at: Timestamp.now(),
                    created_by: currentUser.id
                };

                const guestRef = db.collection('guest_accounts').doc(newEmail);
                transaction.set(guestRef, guestData);
                newGuestsData.push(guestData);
            }

            // Update sequence
            transaction.set(seqRef, { guest_sequence: currentSeq }, { merge: true });

            // Return context for post-transaction actions
            return newGuestsData;
        });

        // 3. Post-transaction actions
        const logsToAppend = [];

        // We can do this in parallel or serial
        for (const guest of result) { // result is the returned array from transaction
            // Create Admin Account (Mocked/Commented)
            // await createGoogleAccount(guest);

            // Log Data: `日時`, `作業者`, `対象アドレス`, `姓`, `名`, `所属`, `承認者`, `用途`, `利用期限`
            const logRow = [
                new Date().toLocaleString('ja-JP'),
                currentUser.id,
                guest.id,
                guest.last_name,
                guest.first_name,
                guest.department,
                guest.approver_id,
                guest.usage_purpose,
                guest.expiration_date.toDate().toLocaleDateString('ja-JP')
            ];

            // Fire and forget or await? Safer to await to ensure log exists.
            await appendLog('発行ログ', logRow);
        }

        return NextResponse.json({ success: true, count: result.length });
    } catch (error) {
        console.error('Issue Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Pseudo function for Admin SDK
async function createGoogleAccount(guest: any) {
    // const admin = google.admin('directory_v1');
    // await admin.users.insert({
    //     requestBody: {
    //         primaryEmail: guest.id,
    //         name: { familyName: guest.last_name, givenName: guest.first_name },
    //         password: 'TemporaryPassword123!',
    //         orgUnitPath: '/Guests'
    //     }
    // });
}
