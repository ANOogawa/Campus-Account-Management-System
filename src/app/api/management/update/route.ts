
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { getSessionEmail, getCurrentUser } from '@/lib/auth';
import { GuestAccount } from '@/types/firestore';
import { logSystemAction } from '@/lib/logs';
import { validateGuestAccount, validateEmail } from '@/lib/validation';

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
                
                // Firestoreにログ保存
                await logSystemAction(
                    'extend',
                    currentUser.id,
                    `${currentUser.last_name} ${currentUser.first_name}`,
                    {
                        expiration_date: newDate.toISOString()
                    },
                    accountId
                );
                break;

            case 'EDIT':
                // 入力値の長さチェック
                const editValidationError = validateGuestAccount({
                    last_name: data.last_name,
                    first_name: data.first_name,
                    department: data.department,
                    usage_purpose: data.usage_purpose
                });
                if (editValidationError) {
                    return NextResponse.json({ error: editValidationError.message }, { status: 400 });
                }

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
                // メールアドレスの形式と長さチェック
                const newApproverEmail = data.new_approver_id;
                const emailValidationError = validateEmail(newApproverEmail, '委譲先承認者メールアドレス');
                if (emailValidationError) {
                    return NextResponse.json({ error: emailValidationError.message }, { status: 400 });
                }

                // Check if new approver exists and is staff
                const newApproverRef = await db.collection('user_master').doc(newApproverEmail).get();
                if (!newApproverRef.exists) {
                    return NextResponse.json({ error: '指定されたメールアドレスのユーザーが見つかりませんでした' }, { status: 400 });
                }
                const newApproverData = newApproverRef.data();
                if (newApproverData?.employment_status !== '正職員') {
                    return NextResponse.json({ error: '指定されたユーザーは正職員ではありません。正職員のみ承認者として指定できます。' }, { status: 400 });
                }

                updateData.approver_id = newApproverEmail;

                // Firestoreにログ保存
                await logSystemAction(
                    'delegate',
                    currentUser.id,
                    `${currentUser.last_name} ${currentUser.first_name}`,
                    {
                        old_approver_id: accountData.approver_id,
                        new_approver_id: newApproverEmail
                    },
                    accountId
                );

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
                
                // Firestoreにログ保存
                await logSystemAction(
                    'extend',
                    currentUser.id,
                    `${currentUser.last_name} ${currentUser.first_name}`,
                    {
                        expiration_date: accountData.requested_expiration_date.toDate().toISOString(),
                        approved: true
                    },
                    accountId
                );
                break;

            case 'SUSPEND':
                // 一時停止処理（休職など）
                // 停止中・アーカイブ・削除のアカウントは停止できない
                if (accountData.status === '停止中' || accountData.status === 'アーカイブ' || accountData.status === '削除') {
                    return NextResponse.json({ error: '既に停止またはアーカイブされているアカウントです' }, { status: 400 });
                }

                updateData.status = '停止中';
                
                // Firestoreにログ保存
                await logSystemAction(
                    'suspend',
                    currentUser.id,
                    `${currentUser.last_name} ${currentUser.first_name}`,
                    {
                        previous_status: accountData.status
                    },
                    accountId
                );
                break;

            case 'ARCHIVE':
                // 削除処理（退職など）- アーカイブとして記録
                // 停止中・アーカイブ・削除のアカウントはアーカイブできない
                if (accountData.status === 'アーカイブ' || accountData.status === '削除') {
                    return NextResponse.json({ error: '既にアーカイブまたは削除されているアカウントです' }, { status: 400 });
                }

                updateData.status = 'アーカイブ';
                updateData.archived_at = Timestamp.now();
                
                // Firestoreにログ保存
                await logSystemAction(
                    'archive',
                    currentUser.id,
                    `${currentUser.last_name} ${currentUser.first_name}`,
                    {
                        previous_status: accountData.status
                    },
                    accountId
                );
                break;

            case 'RESTORE':
                // 復旧処理
                // 停止中・アーカイブのアカウントのみ復旧可能
                if (accountData.status !== '停止中' && accountData.status !== 'アーカイブ') {
                    return NextResponse.json({ error: '停止中またはアーカイブのアカウントのみ復旧できます' }, { status: 400 });
                }

                // 利用期限を確認して適切なステータスに復旧
                const expirationDate = accountData.expiration_date.toDate();
                const now = new Date();
                
                if (expirationDate < now) {
                    // 利用期限が過ぎている場合は「申請中」に戻す
                    updateData.status = '申請中';
                } else {
                    // 利用期限が有効な場合は「利用中」に戻す
                    updateData.status = '利用中';
                }
                
                // アーカイブ日時をクリア
                updateData.archived_at = null;
                
                // Firestoreにログ保存
                await logSystemAction(
                    'restore',
                    currentUser.id,
                    `${currentUser.last_name} ${currentUser.first_name}`,
                    {
                        previous_status: accountData.status,
                        new_status: updateData.status
                    },
                    accountId
                );
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await accountRef.update(updateData);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
