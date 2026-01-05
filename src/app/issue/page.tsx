import { getCurrentUser, getSessionEmail } from "@/lib/auth";
import GuestIssueForm from "@/components/GuestIssueForm";
import { redirect } from "next/navigation";

export default async function GuestIssuePage({
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
        // Should not happen if sidebar links are correct, but valid protection
        return <div className="p-8 text-gray-300">権限がありません</div>;
    }

    // userオブジェクトからFirestore Timestamp（updated_at）とpassword_hashを除外してシリアライズ可能にする
    // GuestIssueFormコンポーネントで使用されるフィールドのみを抽出
    const serializedUser = user ? {
        id: user.id,
        department: user.department
    } : null;

    if (!serializedUser) {
        return <div className="p-8 text-gray-300">ユーザー情報が取得できません</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4 text-white bg-slate-800 px-6 py-4 rounded-2xl shadow-lg">ゲストアカウント発行</h1>
            <p className="mb-6 text-gray-300 font-medium">
                一時的なゲストアカウントを発行します。最大3ヶ月まで指定可能です。
            </p>
            <GuestIssueForm currentUser={serializedUser as any} />
        </div>
    );
}
