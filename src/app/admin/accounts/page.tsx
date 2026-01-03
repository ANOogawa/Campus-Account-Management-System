
import { headers } from "next/headers";
import { getCurrentUser, verifyIapToken } from "@/lib/auth";
import { getAllAccounts } from "@/lib/db_guests";
import ManagementTable, { GuestAccountSerializable } from "@/components/ManagementTable";

export default async function AdminAccountsPage() {
    const headersList = await headers();
    const iapJwt = headersList.get("x-goog-iap-jwt-assertion") || "";
    const email = await verifyIapToken(iapJwt);
    const user = email ? await getCurrentUser(email) : null;

    if (!user || !user.is_admin) {
        return <div className="p-8">管理者権限がありません</div>;
    }

    // Fetch ALL accounts
    const accounts = await getAllAccounts();

    // Serialize Timestamps for Client Component
    const serializedAccounts: GuestAccountSerializable[] = accounts.map(acc => ({
        ...acc,
        expiration_date: acc.expiration_date.toDate().toISOString(),
        requested_expiration_date: acc.requested_expiration_date ? acc.requested_expiration_date.toDate().toISOString() : null,
        last_updated_date: acc.last_updated_date.toDate().toISOString(),
        created_at: acc.created_at ? acc.created_at.toDate().toISOString() : undefined
    }));

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">全アカウント一覧 (管理者)</h1>
            <p className="mb-6 text-gray-600">
                システムに登録されているすべてのゲストアカウントを表示しています。
            </p>
            {/* Show Approver column for admins */}
            <ManagementTable initialAccounts={serializedAccounts} currentUserEmail={user.id} showApprover={true} />
        </div>
    );
}
