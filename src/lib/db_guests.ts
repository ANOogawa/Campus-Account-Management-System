
import { db } from './firebase';
import { GuestAccount } from '@/types/firestore';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * 6ヶ月経過したアーカイブを自動的に「削除」ステータスに更新する
 * この関数は表示時に呼び出されるが、非同期で実行されるため、パフォーマンスへの影響は最小限
 */
async function updateExpiredArchives(): Promise<void> {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgo);

        const snapshot = await db.collection('guest_accounts')
            .where('status', '==', 'アーカイブ')
            .get();

        const batch = db.batch();
        let batchCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data() as GuestAccount;
            if (data.archived_at && data.archived_at < sixMonthsAgoTimestamp) {
                batch.update(doc.ref, {
                    status: '削除',
                    last_updated_date: Timestamp.now()
                });
                batchCount++;
            }
        });

        if (batchCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error('Failed to update expired archives:', error);
        // エラーが発生しても処理を続行
    }
}

export async function getManagedAccounts(approverEmail: string): Promise<GuestAccount[]> {
    // 6ヶ月経過したアーカイブを自動的に「削除」ステータスに更新（非同期で実行）
    updateExpiredArchives().catch(console.error);

    const snapshot = await db.collection('guest_accounts')
        .where('approver_id', '==', approverEmail)
        .get();

    if (snapshot.empty) {
        return [];
    }

    const accounts: GuestAccount[] = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    snapshot.forEach(doc => {
        const data = doc.data() as GuestAccount;

        // Filter: Exclude if status is "削除"
        if (data.status === '削除') {
            return; // Exclude
        }

        // Filter: Exclude if status is "停止中" AND last_updated < 6 months ago
        const isStopped = data.status === '停止中';
        const lastUpdated = data.last_updated_date?.toDate() || new Date(0);
        const isOld = lastUpdated < sixMonthsAgo;

        if (isStopped && isOld) {
            return; // Exclude
        }

        // Filter: Exclude if status is "アーカイブ" AND archived_at < 6 months ago
        if (data.status === 'アーカイブ') {
            const archivedAt = data.archived_at?.toDate();
            if (archivedAt && archivedAt < sixMonthsAgo) {
                // 6ヶ月経過したアーカイブは削除ステータスに変更（実際の削除は行わない）
                // ただし、一覧には表示しないので除外
                return; // Exclude
            }
        }

        accounts.push(data);
    });

    // Sort by expiration date desc or something? Spec doesn't say, but usually useful.
    // Let's sort created/updated desc.
    return accounts.sort((a, b) => {
        const dateA = a.last_updated_date?.toDate().getTime() || 0;
        const dateB = b.last_updated_date?.toDate().getTime() || 0;
        return dateB - dateA;
    });
}

export async function getAllAccounts(): Promise<GuestAccount[]> {
    // 6ヶ月経過したアーカイブを自動的に「削除」ステータスに更新（非同期で実行）
    updateExpiredArchives().catch(console.error);

    const snapshot = await db.collection('guest_accounts').get();

    if (snapshot.empty) {
        return [];
    }

    const accounts: GuestAccount[] = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    snapshot.forEach(doc => {
        const data = doc.data() as GuestAccount;

        // Filter: Exclude if status is "削除"
        if (data.status === '削除') {
            return; // Exclude
        }

        // Filter: Exclude if status is "アーカイブ" AND archived_at < 6 months ago
        if (data.status === 'アーカイブ') {
            const archivedAt = data.archived_at?.toDate();
            if (archivedAt && archivedAt < sixMonthsAgo) {
                // 6ヶ月経過したアーカイブは削除ステータスに変更（実際の削除は行わない）
                // ただし、一覧には表示しないので除外
                // バッチ処理で削除ステータスに更新する必要があるが、ここでは除外のみ
                return; // Exclude
            }
        }

        accounts.push(data);
    });

    return accounts.sort((a, b) => {
        const dateA = a.last_updated_date?.toDate().getTime() || 0;
        const dateB = b.last_updated_date?.toDate().getTime() || 0;
        return dateB - dateA;
    });
}
