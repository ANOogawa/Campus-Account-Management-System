
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
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
        if (!currentUser || currentUser.employment_status !== "正職員") {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { action, accountId, data } = body;
        // action: 'EXTEND' | 'EDIT' | 'DELEGATE' | 'APPROVE_EXTENSION' (Extension from request)

        const accountRef = db.collection('guest_accounts').doc(accountId);
        const accountSnap = await accountRef.get();

        if (!accountSnap.exists) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const accountData = accountSnap.data() as GuestAccount;

        // Verify ownership (except for admin overriding, but spec says "Approver" list)
        if (accountData.approver_id !== currentUser.id && !currentUser.is_admin) {
            return NextResponse.json({ error: 'Not authorized for this account' }, { status: 403 });
        }

        let updateData: any = {
            last_updated_date: Timestamp.now()
        };
        let logSheetName = '';
        let logValues: string[] = [];

        // Current Time
        const nowStr = new Date().toLocaleString('ja-JP');

        switch (action) {
            case 'EXTEND':
                // Date input (data.expiration_date)
                const newDate = new Date(data.expiration_date);

                // Validation: 3 months
                const extendLimit = new Date();
                extendLimit.setMonth(extendLimit.getMonth() + 3);
                if (newDate > extendLimit) {
                    return NextResponse.json({ error: '利用期限が3ヶ月の上限を超えています' }, { status: 400 });
                }

                updateData.expiration_date = Timestamp.fromDate(newDate);

                logSheetName = '延長ログ';
                logValues = [nowStr, currentUser.id, accountId, newDate.toLocaleDateString('ja-JP')];
                break;

            case 'EDIT':
                // Edit Name, Dept, Purpose
                // No specific log sheet for "Edit Info" in spec? 
                // Spec says: "Edit Info" -> Write to guest_accounts.
                // But Spec "Various Logs" only lists: Issue, Extend, ApproverChange, ExtensionRequest.
                // So maybe we don't log to sheet for simple edits? Or put in "Issue Log"?
                // Spec "Edit Info" action description: "guest_accounts に書き込む" only. 
                // So NO SHEET LOG necessary per strict spec reading.
                updateData.last_name = data.last_name;
                updateData.first_name = data.first_name;
                updateData.department = data.department;
                updateData.usage_purpose = data.usage_purpose;
                break;

            case 'DELEGATE':
                // Delegate approver
                // Check if new approver exists and is staff
                const newApproverEmail = data.new_approver_id;
                const newApproverRef = await db.collection('user_master').doc(newApproverEmail).get();
                if (!newApproverRef.exists) {
                    return NextResponse.json({ error: 'New approver not found' }, { status: 400 });
                }
                const newApproverData = newApproverRef.data();
                if (newApproverData?.employment_status !== '正職員') {
                    return NextResponse.json({ error: 'New approver is not staff' }, { status: 400 });
                }

                updateData.approver_id = newApproverEmail;

                // Log: 日時, 作業者, 対象アドレス, 委譲先承認者
                logSheetName = '承認者変更ログ';
                logValues = [nowStr, currentUser.id, accountId, newApproverEmail];

                // Send Email (Mock)
                console.log(`Email sent to ${currentUser.id} and ${newApproverEmail}`);
                break;

            case 'APPROVE_EXTENSION':
                // Approve user request
                // Status -> Utilized, req_date -> null, exp -> req_date
                if (accountData.status !== '延長申請中' || !accountData.requested_expiration_date) {
                    return NextResponse.json({ error: 'Invalid status for approval' }, { status: 400 });
                }

                updateData.status = '利用中';
                updateData.expiration_date = accountData.requested_expiration_date;
                updateData.requested_expiration_date = null;

                // Log: Same as EXTEND? Spec says "Extension Log"
                logSheetName = '延長ログ';
                logValues = [nowStr, currentUser.id, accountId, accountData.requested_expiration_date.toDate().toLocaleDateString('ja-JP')];
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await accountRef.update(updateData);

        if (logSheetName && logValues.length > 0) {
            await appendLog(logSheetName, logValues);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
