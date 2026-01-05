
import { getCurrentUser, getSessionEmail } from "@/lib/auth";
import { getAllAccounts } from "@/lib/db_guests";
import ManagementTable, { GuestAccountSerializable } from "@/components/ManagementTable";
import { redirect } from "next/navigation";

export default async function AdminAccountsPage() {
    const email = await getSessionEmail();
    
    if (!email) {
        redirect('/login');
    }

    const user = await getCurrentUser(email);

    if (!user || !user.is_admin) {
        return <div className="p-8 text-gray-300">管理者権限がありません</div>;
    }

    // Fetch ALL accounts
    const accounts = await getAllAccounts();

    // Serialize Timestamps for Client Component
    const serializedAccounts: GuestAccountSerializable[] = accounts.map(acc => ({
        ...acc,
        expiration_date: acc.expiration_date.toDate().toISOString(),
        requested_expiration_date: acc.requested_expiration_date ? acc.requested_expiration_date.toDate().toISOString() : null,
        last_updated_date: acc.last_updated_date.toDate().toISOString(),
        created_at: acc.created_at ? acc.created_at.toDate().toISOString() : undefined,
        archived_at: acc.archived_at ? acc.archived_at.toDate().toISOString() : undefined
    }));

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4 text-white bg-slate-800 px-6 py-4 rounded-2xl shadow-lg">ゲストアカウント管理</h1>
            <p className="mb-6 text-gray-300 font-medium">
                システムに登録されているすべてのゲストアカウントを表示しています。
            </p>
            {/* Show Approver column for admins */}
            <ManagementTable initialAccounts={serializedAccounts} currentUserEmail={user.id} showApprover={true} />
        </div>
    );
}
