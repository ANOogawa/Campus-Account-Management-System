
import { db } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { UserMasterLog, SystemLog, UserMaster } from '@/types/firestore';

/**
 * user_masterの変更履歴をログに記録
 */
export async function logUserMasterChange(
    action: "CREATE" | "UPDATE" | "DELETE",
    targetUserId: string,
    operatorId: string,
    operatorName: string,
    oldData?: Partial<UserMaster>,
    newData?: Partial<UserMaster>
): Promise<void> {
    try {
        // 変更されたフィールドを特定
        const changedFields: string[] = [];
        if (oldData && newData) {
            const fields: (keyof UserMaster)[] = ['last_name', 'first_name', 'department', 'employment_status', 'is_admin'];
            for (const field of fields) {
                if (oldData[field] !== newData[field]) {
                    changedFields.push(field);
                }
            }
        }

        const log: Omit<UserMasterLog, 'id'> = {
            log_type: "user_master_change",
            action,
            target_user_id: targetUserId,
            operator_id: operatorId,
            operator_name: operatorName,
            old_data: oldData,
            new_data: newData,
            changed_fields: changedFields.length > 0 ? changedFields : undefined,
            timestamp: Timestamp.now(),
            description: getActionDescription(action, changedFields)
        };

        // Firestoreに保存
        await db.collection('user_master_logs').add(log);

    } catch (error) {
        console.error('Failed to log user_master change:', error);
        // ログの失敗は処理を止めない
    }
}

/**
 * システムログを記録（発行、延長、承認者変更、延長申請、停止、アーカイブ、復旧など）
 */
export async function logSystemAction(
    logType: "issue" | "extend" | "delegate" | "extension_request" | "suspend" | "archive" | "restore",
    operatorId: string,
    operatorName: string,
    data: Record<string, any>,
    targetAccountId?: string
): Promise<void> {
    try {
        const log: Omit<SystemLog, 'id'> = {
            log_type: logType,
            operator_id: operatorId,
            operator_name: operatorName,
            target_account_id: targetAccountId,
            data,
            timestamp: Timestamp.now()
        };

        // Firestoreに保存
        await db.collection('system_logs').add(log);
    } catch (error) {
        console.error('Failed to log system action:', error);
        // ログの失敗は処理を止めない
    }
}

/**
 * アクションの説明を生成
 */
function getActionDescription(action: "CREATE" | "UPDATE" | "DELETE", changedFields: string[]): string {
    if (action === 'CREATE') {
        return 'ユーザーを作成しました';
    } else if (action === 'DELETE') {
        return 'ユーザーを削除しました';
    } else {
        if (changedFields.length === 0) {
            return 'ユーザー情報を更新しました';
        }
        return `以下のフィールドを更新しました: ${changedFields.join(', ')}`;
    }
}

/**
 * user_master変更ログを取得
 */
export async function getUserMasterLogs(limit: number = 100): Promise<UserMasterLog[]> {
    try {
        const snapshot = await db.collection('user_master_logs')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as UserMasterLog));
    } catch (error) {
        console.error('Failed to fetch user_master logs:', error);
        return [];
    }
}

/**
 * システムログを取得
 */
export async function getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
    try {
        const snapshot = await db.collection('system_logs')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SystemLog));
    } catch (error) {
        console.error('Failed to fetch system logs:', error);
        return [];
    }
}

