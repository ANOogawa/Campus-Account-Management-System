import { headers } from "next/headers";
import { getCurrentUser, verifyIapToken } from "@/lib/auth";
import GuestIssueForm from "@/components/GuestIssueForm";
import { redirect } from "next/navigation";

export default async function GuestIssuePage() {
    const headersList = await headers();
    const iapJwt = headersList.get("x-goog-iap-jwt-assertion") || "";
    const email = await verifyIapToken(iapJwt);
    const user = email ? await getCurrentUser(email) : null;

    if (!user || user.employment_status !== "正職員") {
        // Should not happen if sidebar links are correct, but valid protection
        return <div className="p-8">権限がありません</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">ゲストアカウント発行</h1>
            <p className="mb-6 text-gray-600">
                一時的なゲストアカウントを発行します。最大3ヶ月まで指定可能です。
            </p>
            <GuestIssueForm currentUser={user} />
        </div>
    );
}
