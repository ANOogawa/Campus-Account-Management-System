
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { getSessionEmail, getCurrentUser } from '@/lib/auth';
import { logSystemAction } from '@/lib/logs';
import { validateGuestAccount } from '@/lib/validation';

export async function POST(request: Request) {
    try {
        // 1. Auth Check
        const email = await getSessionEmail();

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
                // 入力値の長さチェック
                const validationError = validateGuestAccount({
                    last_name: guest.last_name,
                    first_name: guest.first_name,
                    department: guest.department,
                    usage_purpose: guest.usage_purpose,
                    approver_email: guest.approver_email
                });
                if (validationError) {
                    throw new Error(validationError.message);
                }

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
        // We can do this in parallel or serial
        for (const guest of result) { // result is the returned array from transaction
            // Create Admin Account (Mocked/Commented)
            // await createGoogleAccount(guest);

            // Firestoreにログ保存
            await logSystemAction(
                'issue',
                currentUser.id,
                `${currentUser.last_name} ${currentUser.first_name}`,
                {
                    target_account_id: guest.id,
                    last_name: guest.last_name,
                    first_name: guest.first_name,
                    department: guest.department,
                    approver_id: guest.approver_id,
                    usage_purpose: guest.usage_purpose,
                    expiration_date: guest.expiration_date.toDate().toISOString()
                },
                guest.id
            );
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
