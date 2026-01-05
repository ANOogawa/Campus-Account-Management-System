import { getCurrentUser, getSessionEmail } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminSettingsPage() {
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
            <h1 className="text-2xl font-bold mb-4 text-white bg-slate-800 px-6 py-4 rounded-2xl shadow-lg">システム設定</h1>
            <p className="text-gray-300 font-medium">システム管理者用ページです。</p>
        </div>
    );
}
