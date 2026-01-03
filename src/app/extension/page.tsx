
import { headers } from "next/headers";
import { getCurrentUser, verifyIapToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { GuestAccount } from "@/types/firestore";
import ExtensionRequestForm from "../../components/ExtensionRequestForm";

export default async function ExtensionRequestPage() {
    const headersList = await headers();
    const iapJwt = headersList.get("x-goog-iap-jwt-assertion") || "";
    const email = await verifyIapToken(iapJwt);
    const user = email ? await getCurrentUser(email) : null;

    if (!user || !email) {
        return <div className="p-8">ログインしてください</div>;
    }

    // Fetch Guest Account details
    const accountSnap = await db.collection('guest_accounts').doc(email).get();

    if (!accountSnap.exists) {
        return <div className="p-8">ゲストアカウント情報が見つかりません。</div>;
    }

    const account = accountSnap.data() as GuestAccount;
    const currentExp = account.expiration_date.toDate().toLocaleDateString('ja-JP');
    // Serialize for client comp
    const accountStatus = account.status;
    const existingReqDate = account.requested_expiration_date
        ? account.requested_expiration_date.toDate().toLocaleDateString('ja-JP')
        : null;

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">利用期限延長申請</h1>

            <div className="bg-white p-6 rounded shadow mb-6">
                <h2 className="font-bold text-gray-700 mb-2">現在のアカウント情報</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">現在の利用期限:</span>
                        <span className="ml-2 font-bold">{currentExp}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">ステータス:</span>
                        <span className={`ml-2 px-2 rounded-full text-xs ${accountStatus === '利用中' ? 'bg-green-100 text-green-800' :
                            accountStatus === '延長申請中' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                            }`}>
                            {accountStatus}
                        </span>
                    </div>
                    {existingReqDate && (
                        <div className="col-span-2 text-yellow-700 bg-yellow-50 p-2 rounded">
                            現在、 <strong>{existingReqDate}</strong> までの延長を申請中です。
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded shadow border border-gray-200">
                <h2 className="text-xl font-bold mb-4">アカウント情報</h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* ... (other fields) ... */}
                    <div>
                        <dt className="text-sm font-medium text-gray-500">利用期限</dt>
                        <dd className="mt-1 text-sm text-gray-900">{account.expiration_date.toDate().toLocaleDateString('ja-JP')}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${account.status === '利用中' ? 'bg-green-100 text-green-800' :
                                    account.status === '停止中' ? 'bg-gray-100 text-gray-800' :
                                        account.status === '申請中' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'}`}>
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
