
import { db } from './firebase';

export async function hasApprovals(email: string): Promise<boolean> {
    const snapshot = await db.collection('guest_accounts')
        .where('approver_id', '==', email)
        .limit(1)
        .get();

    return !snapshot.empty;
}
