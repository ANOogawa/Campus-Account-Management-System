
"use client";

import { useState } from 'react';
import { GuestAccount } from '@/types/firestore';
import SuccessModal from './SuccessModal';

// Need a serializable version of GuestAccount for props (Timestamp -> string/number)
export interface GuestAccountSerializable extends Omit<GuestAccount, 'expiration_date' | 'requested_expiration_date' | 'last_updated_date' | 'created_at'> {
    expiration_date: string;
    requested_expiration_date?: string | null;
    last_updated_date: string;
    created_at?: string;
}

interface ManagementTableProps {
    initialAccounts: GuestAccountSerializable[];
    currentUserEmail: string;
    showApprover?: boolean;
}

export default function ManagementTable({ initialAccounts, currentUserEmail, showApprover = false }: ManagementTableProps) {
    const [accounts, setAccounts] = useState(initialAccounts);
    const [selectedAccount, setSelectedAccount] = useState<GuestAccountSerializable | null>(null);
    const [modalMode, setModalMode] = useState<'EXTEND' | 'EDIT' | 'DELEGATE' | null>(null);

    // Helpers
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('ja-JP');
    };


    // Form States
    const [extensionDate, setExtensionDate] = useState('');
    const [editForm, setEditForm] = useState({ last_name: '', first_name: '', department: '', usage_purpose: '' });
    const [delegateEmail, setDelegateEmail] = useState('');

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Pre-fill forms when modal opens
    const openModal = (account: GuestAccountSerializable, mode: 'EXTEND' | 'EDIT' | 'DELEGATE') => {
        setSelectedAccount(account);
        setModalMode(mode);

        if (mode === 'EDIT') {
            setEditForm({
                last_name: account.last_name,
                first_name: account.first_name,
                department: account.department,
                usage_purpose: account.usage_purpose
            });
        }
        if (mode === 'EXTEND') {
            // Default to existing expiration or empty?
            // Usually default to current expiration + something? 
            // Let's just set it to current for reference
            setExtensionDate(account.expiration_date.split('T')[0]);
        }
        setDelegateEmail('');
    };

    const handleAction = async () => {
        if (!selectedAccount || !modalMode) return;

        let payload: any = { accountId: selectedAccount.id, action: modalMode };
        let modalData: any = {};

        if (modalMode === 'EXTEND') {
            if (!extensionDate) return alert('日付を入力してください');
            modalData = { expiration_date: extensionDate };
        } else if (modalMode === 'EDIT') {
            modalData = editForm;
        } else if (modalMode === 'DELEGATE') {
            if (!delegateEmail) return alert('メールアドレスを入力してください');
            modalData = { new_approver_id: delegateEmail };
        }

        try {
            const token = localStorage.getItem('iap_token') || '';
            const res = await fetch('/api/management/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: modalMode,
                    accountId: selectedAccount.id,
                    data: modalData
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Update failed');
            }

            // Success
            let msg = '処理が完了しました';
            if (modalMode === 'EXTEND') msg = '有効期限を延長しました';
            if (modalMode === 'EDIT') msg = 'アカウント情報を更新しました';
            if (modalMode === 'DELEGATE') msg = '承認者を変更しました';

            setSuccessMessage(msg);
            setShowSuccessModal(true);

            setModalMode(null);
            setSelectedAccount(null);

            // Refresh list (optimistic update or simple re-fetch could be better, but page reload is simplest for now)
            // router.refresh() in nextjs 13 client component is okay
        } catch (e: any) {
            alert(e.message);
        }
    };

    // Special Approve Extension Handler
    const handleExtensionApproval = async (account: GuestAccountSerializable, approve: boolean) => {
        if (!confirm(approve ? '延長申請を承認しますか？' : '延長申請を却下しますか？')) return;

        try {
            const token = localStorage.getItem('iap_token') || '';
            const res = await fetch('/api/management/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'APPROVE_EXTENSION',
                    accountId: account.id,
                    data: { approve }
                })
            });
            if (!res.ok) throw new Error('Failed');

            setSuccessMessage(approve ? '延長申請を承認しました' : '延長申請を却下しました');
            setShowSuccessModal(true);

        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div>
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    // Reload to reflect changes
                    window.location.reload();
                }}
                message={successMessage}
            />

            <div className="bg-white rounded shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メールアドレス</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属</th>
                                {showApprover && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">承認者</th>}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用途</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">利用期限</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {accounts.length === 0 ? (
                                <tr>
                                    <td colSpan={showApprover ? 8 : 7} className="px-6 py-4 text-center text-gray-500">
                                        承認中のアカウントはありません
                                    </td>
                                </tr>
                            ) : (
                                accounts.map((account) => (
                                    <tr key={account.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.last_name} {account.first_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.department}</td>
                                        {showApprover && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.approver_id}</td>}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.usage_purpose}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(account.expiration_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${account.status === '利用中' ? 'bg-green-100 text-green-800' :
                                                    account.status === '停止中' ? 'bg-gray-100 text-gray-800' :
                                                        account.status === '申請中' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-blue-100 text-blue-800'}`}>
                                                {account.status}
                                            </span>
                                            {account.status === '延長申請中' && account.requested_expiration_date && (
                                                <div className="text-xs text-red-500 mt-1">
                                                    希望: {formatDate(account.requested_expiration_date)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                                            <button
                                                onClick={() => openModal(account, 'EXTEND')}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                期限延長
                                            </button>
                                            <button
                                                onClick={() => openModal(account, 'EDIT')}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                修正
                                            </button>
                                            <button
                                                onClick={() => openModal(account, 'DELEGATE')}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                承認者変更
                                            </button>

                                            {account.status === '延長申請中' && (
                                                <button
                                                    onClick={() => handleExtensionApproval(account, true)}
                                                    className="text-red-600 hover:text-red-900 font-bold block mt-2"
                                                >
                                                    延長承認
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalMode && selectedAccount && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-white p-5 rounded-lg shadow-xl w-96">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold">
                                {modalMode === 'EXTEND' ? '期限延長' :
                                    modalMode === 'EDIT' ? '情報修正' : '承認者変更'}
                            </h3>
                            <p className="text-sm text-gray-500">{selectedAccount.id}</p>
                        </div>

                        <div className="mb-4 space-y-4">
                            {modalMode === 'EXTEND' && (
                                <div>
                                    <label className="block text-sm">新しい期限</label>
                                    <input
                                        type="date"
                                        className="w-full border p-2 rounded"
                                        value={extensionDate}
                                        onChange={(e) => setExtensionDate(e.target.value)}
                                        max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
                                    />
                                </div>
                            )}

                            {modalMode === 'EDIT' && (
                                <>
                                    <input placeholder="姓" className="w-full border p-2 rounded" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
                                    <input placeholder="名" className="w-full border p-2 rounded" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
                                    <input placeholder="所属" className="w-full border p-2 rounded" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} />
                                    <input placeholder="用途" className="w-full border p-2 rounded" value={editForm.usage_purpose} onChange={e => setEditForm({ ...editForm, usage_purpose: e.target.value })} />
                                </>
                            )}

                            {modalMode === 'DELEGATE' && (
                                <div>
                                    <label className="block text-sm">委譲先承認者アドレス</label>
                                    <input
                                        type="email"
                                        className="w-full border p-2 rounded"
                                        value={delegateEmail}
                                        onChange={(e) => setDelegateEmail(e.target.value)}
                                    />
                                    <p className="text-xs text-red-500 mt-1">※正職員のみ指定可能</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setModalMode(null); setSelectedAccount(null); }}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleAction}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                実行
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
