
import { db } from './firebase';
import { GuestAccount } from '@/types/firestore';

export async function getManagedAccounts(approverEmail: string): Promise<GuestAccount[]> {
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

        // Filter: Exclude if status is "停止中" AND last_updated < 6 months ago
        // Spec: "stopped" and "older than 6 months" excluded.
        // So if Stopped AND Old, skip.
        // Wait, spec says: (status === "停止中" and last_updated_date < (today - 6 months)) are EXCLUDED.

        const isStopped = data.status === '停止中';
        const lastUpdated = data.last_updated_date?.toDate() || new Date(0);
        const isOld = lastUpdated < sixMonthsAgo;

        if (isStopped && isOld) {
            return; // Exclude
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
    const snapshot = await db.collection('guest_accounts').get();

    if (snapshot.empty) {
        return [];
    }

    const accounts: GuestAccount[] = [];
    snapshot.forEach(doc => {
        accounts.push(doc.data() as GuestAccount);
    });

    return accounts.sort((a, b) => {
        const dateA = a.last_updated_date?.toDate().getTime() || 0;
        const dateB = b.last_updated_date?.toDate().getTime() || 0;
        return dateB - dateA;
    });
}
