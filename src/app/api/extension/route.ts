
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { verifyIapToken, getCurrentUser } from '@/lib/auth';
import { appendLog } from '@/lib/sheets';
import { GuestAccount } from '@/types/firestore';

export async function POST(request: Request) {
    try {
        // 1. Auth Check
        const headersList = await headers();
        const iapJwt = headersList.get("x-goog-iap-jwt-assertion") || "";
        const email = await verifyIapToken(iapJwt);

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

        // Log to Sheet
        // Sheet: `延長申請ログ`
        // Columns: `日時`, `作業者`, `希望利用期限`
        const nowStr = new Date().toLocaleString('ja-JP');
        const reqDateStr = new Date(requested_date).toLocaleDateString('ja-JP');

        await appendLog('延長申請ログ', [nowStr, email, reqDateStr]);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Extension Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
