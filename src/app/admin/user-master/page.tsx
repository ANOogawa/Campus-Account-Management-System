
import { getCurrentUser, getSessionEmail } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserMasterTable, { UserMasterSerializable } from "@/components/UserMasterTable";
import { db } from "@/lib/firebase";

export default async function AdminUserMasterPage() {
    const email = await getSessionEmail();
    
    if (!email) {
        redirect('/login');
    }

    const user = await getCurrentUser(email);

    if (!user || !user.is_admin) {
        return <div className="p-8 text-gray-300">管理者権限がありません</div>;
    }

    // user_master一覧を取得
    const snapshot = await db.collection('user_master').get();
    const users: UserMasterSerializable[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            last_name: data.last_name || '',
            first_name: data.first_name || '',
            department: data.department || '',
            employment_status: data.employment_status || 'その他',
            is_admin: data.is_admin || false,
            updated_at: data.updated_at ? data.updated_at.toDate().toISOString() : undefined
        };
    });

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4 text-white bg-slate-800 px-6 py-4 rounded-2xl shadow-lg">管理ユーザー管理</h1>
            <p className="mb-6 text-gray-300 font-medium">
                システムに登録されているユーザーを管理します。ユーザーの追加、編集、削除が可能です。
            </p>
            <UserMasterTable initialUsers={users} currentUserEmail={user.id} />
        </div>
    );
}

