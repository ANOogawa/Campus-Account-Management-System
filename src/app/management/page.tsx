import { headers } from "next/headers";
import { getCurrentUser, verifyIapToken } from "@/lib/auth";
import { getManagedAccounts } from "@/lib/db_guests";
import ManagementTable, { GuestAccountSerializable } from "@/components/ManagementTable";

export default async function ManagementPage() {
    const headersList = await headers();
    const iapJwt = headersList.get("x-goog-iap-jwt-assertion") || "";
    const email = await verifyIapToken(iapJwt);
    const user = email ? await getCurrentUser(email) : null;

    if (!user || user.employment_status !== "正職員") {
        return <div className="p-8">権限がありません</div>;
    }

    // Fetch accounts managed by this user
    const accounts = await getManagedAccounts(user.id);

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
            <h1 className="text-2xl font-bold mb-4">承認中アカウント一覧</h1>
            <p className="mb-6 text-gray-600">
                あなたが承認者となっているゲストアカウントの一覧です。
            </p>
            <ManagementTable initialAccounts={serializedAccounts} currentUserEmail={user.id} />
        </div>
    );
}
