
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { getSessionEmail, getCurrentUser } from '@/lib/auth';
import { GuestAccount } from '@/types/firestore';
import { logSystemAction } from '@/lib/logs';

export async function POST(request: Request) {
    try {
        // 1. Auth Check
        const email = await getSessionEmail();

        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await getCurrentUser(email);
        // Spec: "employment_status === 'ゲスト'" only? Or anyone? 
        // Spec 6.D says "Guest Screen". Let's restrict to Guest or at least require them to be in guest_accounts.

        // Check if account exists in guest_accounts
        const accountRef = db.collection('guest_accounts').doc(email);
        const accountSnap = await accountRef.get();

        if (!accountSnap.exists) {
            return NextResponse.json({ error: 'Guest account not found' }, { status: 404 });
        }

        const body = await request.json();
        const { requested_date } = body;

        if (!requested_date) {
            return NextResponse.json({ error: 'Date required' }, { status: 400 });
        }

        const reqDate = new Date(requested_date);
        const limitDate = new Date();
        limitDate.setMonth(limitDate.getMonth() + 3);

        if (reqDate > limitDate) {
            return NextResponse.json({ error: '延長希望日が3ヶ月の上限を超えています' }, { status: 400 });
        }

        // Update Firestore
        await accountRef.update({
            status: '延長申請中',
            requested_expiration_date: Timestamp.fromDate(reqDate),
            last_updated_date: Timestamp.now()
        });

        // Firestoreにログ保存
        if (currentUser) {
            await logSystemAction(
                'extension_request',
                email,
                `${currentUser.last_name} ${currentUser.first_name}`,
                {
                    requested_date: reqDate.toISOString()
                },
                email
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Extension Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
