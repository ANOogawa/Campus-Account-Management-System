
import { getCurrentUser, getSessionEmail } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { GuestAccount } from "@/types/firestore";
import ExtensionRequestForm from "../../components/ExtensionRequestForm";
import { redirect } from "next/navigation";

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

export default async function ExtensionRequestPage() {
    const email = await getSessionEmail();
    
    if (!email) {
        redirect('/login');
    }

    const user = await getCurrentUser(email);

    if (!user || !email) {
        return <div className="p-8 text-gray-300">ログインしてください</div>;
    }

    // Fetch Guest Account details
    const accountSnap = await db.collection('guest_accounts').doc(email).get();

    if (!accountSnap.exists) {
        return <div className="p-8 text-gray-300">ゲストアカウント情報が見つかりません。</div>;
    }

    const account = accountSnap.data() as GuestAccount;
    const currentExp = formatDate(account.expiration_date.toDate());
    // Serialize for client comp
    const accountStatus = account.status;
    const existingReqDate = account.requested_expiration_date
        ? formatDate(account.requested_expiration_date.toDate())
        : null;

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4 text-white bg-slate-800 px-6 py-4 rounded-2xl shadow-lg">利用期限延長申請</h1>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-md mb-6 border border-gray-700">
                <h2 className="font-bold text-gray-100 mb-2">現在のアカウント情報</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">現在の利用期限:</span>
                        <span className="ml-2 font-bold text-gray-200">{currentExp}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">ステータス:</span>
                        <span className={`ml-2 px-2 py-1 rounded-lg text-xs ${accountStatus === '利用中' ? 'bg-green-900 text-green-200 border border-green-700' :
                            accountStatus === '延長申請中' ? 'bg-yellow-900 text-yellow-200 border border-yellow-700' : 'bg-gray-700 border border-gray-600'
                            }`}>
                            {accountStatus}
                        </span>
                    </div>
                    {existingReqDate && (
                        <div className="col-span-2 text-yellow-200 bg-yellow-900 p-3 rounded-xl border border-yellow-700">
                            現在、 <strong>{existingReqDate}</strong> までの延長を申請中です。
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-gray-100">アカウント情報</h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* ... (other fields) ... */}
                    <div>
                        <dt className="text-sm font-medium text-gray-400">利用期限</dt>
                        <dd className="mt-1 text-sm text-gray-200">{formatDate(account.expiration_date.toDate())}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-gray-400">ステータス</dt>
                        <dd className="mt-1 text-sm text-gray-200">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg border
                                    ${account.status === '利用中' ? 'bg-green-900 text-green-200 border-green-700' :
                                    account.status === '停止中' ? 'bg-gray-700 text-gray-200 border-gray-600' :
                                        account.status === '申請中' ? 'bg-yellow-900 text-yellow-200 border-yellow-700' :
                                            'bg-blue-900 text-blue-200 border-blue-700'}`}>
                                {account.status}
                            </span>
                        </dd>
                    </div>
                </dl>
            </div>

            <ExtensionRequestForm
                currentExpiration={account.expiration_date.toDate().toISOString()}
                currentStatus={account.status}
            />
        </div>
    );
}
