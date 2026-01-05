import { getCurrentUser, getSessionEmail } from "@/lib/auth";
import { getManagedAccounts } from "@/lib/db_guests";
import ManagementTable, { GuestAccountSerializable } from "@/components/ManagementTable";
import { redirect } from "next/navigation";

export default async function ManagementPage({
    searchParams,
}: {
    searchParams?: { view?: string };
}) {
    const email = await getSessionEmail();
    
    if (!email) {
        redirect('/login');
    }

    const user = await getCurrentUser(email);

    // 管理者が通常ユーザービューモードで閲覧する場合を許可
    const isUserViewMode = searchParams?.view === 'user';
    const hasPermission = user && (user.employment_status === "正職員" || (user.is_admin && isUserViewMode));

    if (!hasPermission) {
        return <div className="p-8 text-gray-300">権限がありません</div>;
    }

    // Fetch accounts managed by this user
    const accounts = await getManagedAccounts(user.id);

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
            <h1 className="text-2xl font-bold mb-4 text-white bg-slate-800 px-6 py-4 rounded-2xl shadow-lg">承認中ゲストアカウント管理</h1>
            <p className="mb-6 text-gray-300 font-medium">
                あなたが承認者となっているゲストアカウントの一覧です。
            </p>
            <ManagementTable initialAccounts={serializedAccounts} currentUserEmail={user.id} />
        </div>
    );
}
