
import { getCurrentUser, getSessionEmail } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogsViewer from "@/components/LogsViewer";

export default async function AdminLogsPage() {
    const email = await getSessionEmail();
    
    if (!email) {
        redirect('/login');
    }

    const user = await getCurrentUser(email);

    if (!user || !user.is_admin) {
        return <div className="p-8 text-gray-300">管理者権限がありません</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4 text-white bg-slate-800 px-6 py-4 rounded-2xl shadow-lg">ログ閲覧</h1>
            <p className="mb-6 text-gray-300 font-medium">
                システムの各種ログを閲覧できます。管理ユーザーの変更履歴やゲストアカウント変更履歴を確認できます。
            </p>
            <LogsViewer />
        </div>
    );
}

