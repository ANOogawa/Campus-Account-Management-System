"use client";

import { useState, useMemo } from 'react';
import { GuestAccount } from '@/types/firestore';
import SuccessModal from './SuccessModal';
import { FIELD_MAX_LENGTHS, validateGuestAccount, validateEmail } from '@/lib/validation';

// Need a serializable version of GuestAccount for props (Timestamp -> string/number)
export interface GuestAccountSerializable extends Omit<GuestAccount, 'expiration_date' | 'requested_expiration_date' | 'last_updated_date' | 'created_at' | 'archived_at'> {
    expiration_date: string;
    requested_expiration_date?: string | null;
    last_updated_date: string;
    created_at?: string;
    archived_at?: string;
}

interface ManagementTableProps {
    initialAccounts: GuestAccountSerializable[];
    currentUserEmail: string;
    showApprover?: boolean;
}

type SortColumn = 'id' | 'last_name' | 'first_name' | 'department' | 'approver_id' | 'usage_purpose' | 'expiration_date' | 'status';
type SortDirection = 'asc' | 'desc';

export default function ManagementTable({ initialAccounts, currentUserEmail, showApprover = false }: ManagementTableProps) {
    const [sortColumn, setSortColumn] = useState<SortColumn>('id');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [filterDepartment, setFilterDepartment] = useState<string>('');
    const [filterApprover, setFilterApprover] = useState<string>('');
    
    // フィルターオプションを取得
    const departmentOptions = useMemo(() => {
        const departments = new Set(initialAccounts.map(acc => acc.department).filter(Boolean));
        return Array.from(departments).sort();
    }, [initialAccounts]);
    
    const approverOptions = useMemo(() => {
        const approvers = new Set(initialAccounts.map(acc => acc.approver_id).filter(Boolean));
        return Array.from(approvers).sort();
    }, [initialAccounts]);
    
    // フィルターされたアカウントリスト
    const filteredAccounts = useMemo(() => {
        return initialAccounts.filter(account => {
            if (filterDepartment && account.department !== filterDepartment) return false;
            if (filterApprover && account.approver_id !== filterApprover) return false;
            return true;
        });
    }, [initialAccounts, filterDepartment, filterApprover]);
    
    // ソートされたアカウントリスト
    const sortedAccounts = useMemo(() => {
        const sorted = [...filteredAccounts].sort((a, b) => {
            let aValue: any;
            let bValue: any;
            
            switch (sortColumn) {
                case 'id':
                    aValue = a.id.toLowerCase();
                    bValue = b.id.toLowerCase();
                    break;
                case 'last_name':
                    aValue = a.last_name.toLowerCase();
                    bValue = b.last_name.toLowerCase();
                    break;
                case 'first_name':
                    aValue = a.first_name.toLowerCase();
                    bValue = b.first_name.toLowerCase();
                    break;
                case 'department':
                    aValue = a.department.toLowerCase();
                    bValue = b.department.toLowerCase();
                    break;
                case 'approver_id':
                    aValue = (a.approver_id || '').toLowerCase();
                    bValue = (b.approver_id || '').toLowerCase();
                    break;
                case 'usage_purpose':
                    aValue = a.usage_purpose.toLowerCase();
                    bValue = b.usage_purpose.toLowerCase();
                    break;
                case 'expiration_date':
                    aValue = new Date(a.expiration_date).getTime();
                    bValue = new Date(b.expiration_date).getTime();
                    break;
                case 'status':
                    aValue = a.status.toLowerCase();
                    bValue = b.status.toLowerCase();
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }, [filteredAccounts, sortColumn, sortDirection]);
    
    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };
    
    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) {
            return <span className="ml-1 text-gray-500">↕</span>;
        }
        return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    };
    const [selectedAccount, setSelectedAccount] = useState<GuestAccountSerializable | null>(null);
    const [modalMode, setModalMode] = useState<'EXTEND' | 'EDIT' | 'DELEGATE' | 'SUSPEND' | 'RESTORE' | null>(null);

    // Helpers
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    };


    // Form States
    const [extensionDate, setExtensionDate] = useState('');
    const [editForm, setEditForm] = useState({ last_name: '', first_name: '', department: '', usage_purpose: '' });
    const [delegateEmail, setDelegateEmail] = useState('');

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // Delegate confirmation state
    const [showDelegateConfirm, setShowDelegateConfirm] = useState(false);
    const [delegateUserInfo, setDelegateUserInfo] = useState<{ last_name: string; first_name: string; department: string } | null>(null);
    const [delegateError, setDelegateError] = useState<string>('');
    
    // Suspend modal state
    const [suspendAction, setSuspendAction] = useState<'SUSPEND' | 'ARCHIVE' | null>(null);

    // Pre-fill forms when modal opens
    const openModal = (account: GuestAccountSerializable, mode: 'EXTEND' | 'EDIT' | 'DELEGATE' | 'SUSPEND' | 'RESTORE') => {
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
        if (mode === 'SUSPEND') {
            setSuspendAction(null);
        }
        setDelegateEmail('');
        setDelegateError('');
        setShowDelegateConfirm(false);
        setDelegateUserInfo(null);
    };

    // 委譲先ユーザーの確認処理
    const checkAndConfirmDelegate = async (email: string) => {
        try {
            setDelegateError('');
            const token = localStorage.getItem('iap_token') || '';
            const res = await fetch('/api/management/check-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userEmail: email })
            });

            const data = await res.json();

            if (!res.ok) {
                // エラーメッセージを日本語で表示
                const errorMsg = data.error || 'ユーザーの確認に失敗しました';
                setDelegateError(errorMsg);
                return;
            }

            if (data.found && data.user) {
                // ユーザーが見つかった場合、確認画面を表示
                setDelegateUserInfo({
                    last_name: data.user.last_name,
                    first_name: data.user.first_name,
                    department: data.user.department
                });
                setShowDelegateConfirm(true);
            } else {
                setDelegateError('ユーザーが見つかりませんでした');
            }
        } catch (e: any) {
            setDelegateError('ユーザーの確認中にエラーが発生しました: ' + e.message);
        }
    };

    // 委譲処理の実行
    const executeDelegate = async () => {
        if (!selectedAccount || !delegateEmail) return;

        try {
            const token = localStorage.getItem('iap_token') || '';
            const res = await fetch('/api/management/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'DELEGATE',
                    accountId: selectedAccount.id,
                    data: { new_approver_id: delegateEmail }
                })
            });

            if (!res.ok) {
                const err = await res.json();
                // エラーメッセージを日本語で表示
                const errorMsg = err.error || '承認者の変更に失敗しました';
                throw new Error(errorMsg);
            }

            // Success
            setSuccessMessage('承認者を変更しました');
            setShowSuccessModal(true);

            setModalMode(null);
            setSelectedAccount(null);
            setShowDelegateConfirm(false);
            setDelegateUserInfo(null);
            setDelegateEmail('');

            // Refresh list
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleAction = async () => {
        if (!selectedAccount || !modalMode) return;

        let payload: any = { accountId: selectedAccount.id, action: modalMode };
        let modalData: any = {};

        if (modalMode === 'EXTEND') {
            if (!extensionDate) return alert('日付を入力してください');
            modalData = { expiration_date: extensionDate };
        } else if (modalMode === 'EDIT') {
            // バリデーション
            const validationError = validateGuestAccount({
                last_name: editForm.last_name,
                first_name: editForm.first_name,
                department: editForm.department,
                usage_purpose: editForm.usage_purpose
            });
            if (validationError) {
                alert(validationError.message);
                return;
            }
            modalData = editForm;
        } else if (modalMode === 'DELEGATE') {
            if (!delegateEmail) {
                alert('メールアドレスを入力してください');
                return;
            }
            // バリデーション
            const emailValidationError = validateEmail(delegateEmail, '委譲先承認者メールアドレス');
            if (emailValidationError) {
                alert(emailValidationError.message);
                return;
            }
            
            // ユーザー情報を取得して確認画面を表示
            await checkAndConfirmDelegate(delegateEmail);
            return; // 確認画面で処理を続けるため、ここでreturn
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

    // Suspend/Archive Handler
    const handleSuspendAction = async () => {
        if (!selectedAccount || !suspendAction) return;

        try {
            const token = localStorage.getItem('iap_token') || '';
            const res = await fetch('/api/management/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: suspendAction,
                    accountId: selectedAccount.id,
                    data: {}
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '処理に失敗しました');
            }

            const msg = suspendAction === 'SUSPEND' ? 'アカウントを一時停止しました' : 'アカウントをアーカイブしました';
            setSuccessMessage(msg);
            setShowSuccessModal(true);
            setModalMode(null);
            setSelectedAccount(null);
            setSuspendAction(null);
        } catch (e: any) {
            alert(e.message);
        }
    };

    // Restore Handler
    const handleRestore = async (account: GuestAccountSerializable) => {
        if (!confirm('アカウントを復旧しますか？')) return;

        try {
            const token = localStorage.getItem('iap_token') || '';
            const res = await fetch('/api/management/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'RESTORE',
                    accountId: account.id,
                    data: {}
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '復旧に失敗しました');
            }

            setSuccessMessage('アカウントを復旧しました');
            setShowSuccessModal(true);
            setModalMode(null);
            setSelectedAccount(null);
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

            <div className="bg-gray-800 border border-gray-700 overflow-hidden rounded-2xl shadow-md">
                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y divide-gray-700 table-fixed ${showApprover ? '' : ''}`}>
                        <colgroup>
                            <col className="w-[12%]" />
                            <col className="w-[15%]" />
                            <col className="w-[10%]" />
                            <col className="w-[12%]" />
                            {showApprover && <col className="w-[12%]" />}
                            <col className={showApprover ? "w-[20%]" : "w-[24%]"} />
                            <col className="w-[8%]" />
                            <col className="w-[11%]" />
                        </colgroup>
                        <thead className="bg-gray-700 border-b border-gray-600">
                            <tr>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span>操作</span>
                                        <div className="h-[20px] text-xs px-1 py-0.5"></div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('id')}
                                        >
                                            メールアドレス <SortIcon column="id" />
                                        </span>
                                        <div className="h-[20px] text-xs px-1 py-0.5"></div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('last_name')}
                                        >
                                            氏名 <SortIcon column="last_name" />
                                        </span>
                                        <div className="h-[20px] text-xs px-1 py-0.5"></div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('department')}
                                        >
                                            所属 <SortIcon column="department" />
                                        </span>
                                        <select
                                            className="w-full text-xs px-1 py-0.5 border border-gray-500 rounded bg-gray-600 text-gray-200 focus:bg-gray-500 focus:outline-none"
                                            value={filterDepartment}
                                            onChange={(e) => setFilterDepartment(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">すべて</option>
                                            {departmentOptions.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                </th>
                                {showApprover && (
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                        <div className="flex flex-col gap-1">
                                            <span 
                                                className="cursor-pointer hover:text-gray-100 select-none"
                                                onClick={() => handleSort('approver_id')}
                                            >
                                                承認者 <SortIcon column="approver_id" />
                                            </span>
                                            <select
                                                className="w-full text-xs px-1 py-0.5 border border-gray-500 rounded bg-gray-600 text-gray-200 focus:bg-gray-500 focus:outline-none"
                                                value={filterApprover}
                                                onChange={(e) => setFilterApprover(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="">すべて</option>
                                                {approverOptions.map(approver => (
                                                    <option key={approver} value={approver}>{approver}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </th>
                                )}
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('usage_purpose')}
                                        >
                                            用途 <SortIcon column="usage_purpose" />
                                        </span>
                                        <div className="h-[20px] text-xs px-1 py-0.5"></div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('expiration_date')}
                                        >
                                            利用期限 <SortIcon column="expiration_date" />
                                        </span>
                                        <div className="h-[20px] text-xs px-1 py-0.5"></div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('status')}
                                        >
                                            ステータス <SortIcon column="status" />
                                        </span>
                                        <div className="h-[20px] text-xs px-1 py-0.5"></div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {sortedAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={showApprover ? 8 : 7} className="px-2 py-4 text-center text-xs text-gray-400">
                                        承認中のアカウントはありません
                                    </td>
                                </tr>
                            ) : (
                                sortedAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-gray-700 transition-colors">
                                        <td className="px-2 py-2 text-xs text-gray-400">
                                            <div className="flex flex-col gap-1">
                                                {(account.status === '停止中' || account.status === 'アーカイブ') ? (
                                                    <button
                                                        onClick={() => handleRestore(account)}
                                                        className="px-2 py-1 bg-green-500 text-white text-xs hover:bg-green-600 transition-all duration-200 text-center border-0 rounded-lg shadow-sm"
                                                    >
                                                        復旧
                                                    </button>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            <button
                                                                onClick={() => openModal(account, 'EXTEND')}
                                                                className="px-2 py-1 bg-indigo-500 text-white text-xs hover:bg-indigo-600 transition-all duration-200 text-center border-0 rounded-lg shadow-sm"
                                                            >
                                                                期限延長
                                                            </button>
                                                            <button
                                                                onClick={() => openModal(account, 'EDIT')}
                                                                className="px-2 py-1 bg-slate-500 text-white text-xs hover:bg-slate-600 transition-all duration-200 text-center border-0 rounded-lg shadow-sm"
                                                            >
                                                                修正
                                                            </button>
                                                            <button
                                                                onClick={() => openModal(account, 'DELEGATE')}
                                                                className="px-2 py-1 bg-blue-500 text-white text-xs hover:bg-blue-600 transition-all duration-200 text-center border-0 rounded-lg shadow-sm"
                                                            >
                                                                承認者変更
                                                            </button>
                                                            <button
                                                                onClick={() => openModal(account, 'SUSPEND')}
                                                                className="px-2 py-1 bg-red-500 text-white text-xs hover:bg-red-600 transition-all duration-200 text-center border-0 rounded-lg shadow-sm"
                                                            >
                                                                停止
                                                            </button>
                                                        </div>
                                                        {account.status === '延長申請中' && (
                                                            <button
                                                                onClick={() => handleExtensionApproval(account, true)}
                                                                className="px-2 py-1 bg-green-500 text-white text-xs hover:bg-green-600 transition-all duration-200 text-center font-semibold border-0 rounded-lg shadow-sm"
                                                            >
                                                                延長承認
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-xs font-medium text-gray-200 break-words">
                                            {account.id}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                            {account.last_name} {account.first_name}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                            {account.department}
                                        </td>
                                        {showApprover && (
                                            <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                                {account.approver_id}
                                            </td>
                                        )}
                                        <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                            {account.usage_purpose}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                            {formatDate(account.expiration_date)}
                                        </td>
                                        <td className="px-2 py-2 text-xs break-words">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-tight font-semibold rounded-lg
                                                        ${account.status === '利用中' ? 'bg-green-900 text-green-200 border border-green-700' :
                                                    account.status === '停止中' ? 'bg-gray-700 text-gray-200 border border-gray-600' :
                                                        account.status === 'アーカイブ' ? 'bg-orange-900 text-orange-200 border border-orange-700' :
                                                        account.status === '申請中' ? 'bg-yellow-900 text-yellow-200 border border-yellow-700' :
                                                            'bg-blue-900 text-blue-200 border border-blue-700'}`}>
                                                {account.status}
                                            </span>
                                            {account.status === '延長申請中' && account.requested_expiration_date && (
                                                <div className="text-xs text-red-400 mt-1 font-medium">
                                                    希望: {formatDate(account.requested_expiration_date)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalMode && selectedAccount && !showDelegateConfirm && modalMode !== 'SUSPEND' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-xl w-96">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-100">
                                {modalMode === 'EXTEND' ? '期限延長' :
                                    modalMode === 'EDIT' ? '情報修正' : '承認者変更'}
                            </h3>
                            <p className="text-sm text-gray-300 mt-1">{selectedAccount.id}</p>
                        </div>

                        <div className="mb-4 space-y-4">
                            {modalMode === 'EXTEND' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">新しい期限</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        value={extensionDate}
                                        onChange={(e) => setExtensionDate(e.target.value)}
                                        max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
                                    />
                                </div>
                            )}

                            {modalMode === 'EDIT' && (
                                <>
                                    <input 
                                        placeholder="姓" 
                                        maxLength={FIELD_MAX_LENGTHS.last_name}
                                        className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                                        value={editForm.last_name} 
                                        onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} 
                                    />
                                    <input 
                                        placeholder="名" 
                                        maxLength={FIELD_MAX_LENGTHS.first_name}
                                        className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                                        value={editForm.first_name} 
                                        onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} 
                                    />
                                    <input 
                                        placeholder="所属" 
                                        maxLength={FIELD_MAX_LENGTHS.department}
                                        className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                                        value={editForm.department} 
                                        onChange={e => setEditForm({ ...editForm, department: e.target.value })} 
                                    />
                                    <input 
                                        placeholder="用途" 
                                        maxLength={FIELD_MAX_LENGTHS.usage_purpose}
                                        className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                                        value={editForm.usage_purpose} 
                                        onChange={e => setEditForm({ ...editForm, usage_purpose: e.target.value })} 
                                    />
                                </>
                            )}

                            {modalMode === 'DELEGATE' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">委譲先承認者アドレス</label>
                                    <input
                                        type="email"
                                        maxLength={FIELD_MAX_LENGTHS.email}
                                        className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        value={delegateEmail}
                                        onChange={(e) => {
                                            setDelegateEmail(e.target.value);
                                            setDelegateError('');
                                            setShowDelegateConfirm(false);
                                            setDelegateUserInfo(null);
                                        }}
                                    />
                                    <p className="text-xs text-red-400 mt-1">※正職員のみ指定可能</p>
                                    {delegateError && (
                                        <p className="text-xs text-red-400 mt-2 font-semibold">{delegateError}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { 
                                    setModalMode(null); 
                                    setSelectedAccount(null);
                                    setShowDelegateConfirm(false);
                                    setDelegateUserInfo(null);
                                    setDelegateError('');
                                }}
                                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-xl hover:bg-gray-500 transition-all duration-200 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleAction}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-md"
                            >
                                {modalMode === 'DELEGATE' ? '確認' : '実行'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 委譲確認モーダル */}
            {showDelegateConfirm && delegateUserInfo && selectedAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-xl w-96">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-100 mb-2">承認者変更の確認</h3>
                            <p className="text-sm text-gray-300 mb-4">
                                以下のユーザーに承認者を変更します。よろしいですか？
                            </p>
                        </div>

                        <div className="mb-4 p-4 bg-gray-700 rounded-xl border border-gray-600">
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm font-medium text-gray-300">メールアドレス:</span>
                                    <p className="text-sm text-gray-200 mt-1">{delegateEmail}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-300">氏名:</span>
                                    <p className="text-sm text-gray-200 mt-1">{delegateUserInfo.last_name} {delegateUserInfo.first_name}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-300">所属:</span>
                                    <p className="text-sm text-gray-200 mt-1">{delegateUserInfo.department}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDelegateConfirm(false);
                                    setDelegateUserInfo(null);
                                }}
                                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-xl hover:bg-gray-500 transition-all duration-200 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={executeDelegate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-md"
                            >
                                実行
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 停止モーダル */}
            {modalMode === 'SUSPEND' && selectedAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-xl w-96">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-100 mb-2">ゲストアカウントの停止</h3>
                            <p className="text-sm text-gray-300 mb-4">
                                {selectedAccount.id}
                            </p>
                        </div>

                        <div className="mb-6 space-y-3">
                            <button
                                onClick={() => setSuspendAction('SUSPEND')}
                                className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 ${
                                    suspendAction === 'SUSPEND' 
                                        ? 'border-blue-500 bg-blue-900 shadow-md' 
                                        : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                <div className="font-semibold text-gray-100">一時停止（休職など）</div>
                                <div className="text-sm text-gray-300 mt-1">
                                    ステータスは「停止中」になります。利用期限が超えていなければ削除になることはありません。
                                </div>
                            </button>
                            <button
                                onClick={() => setSuspendAction('ARCHIVE')}
                                className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 ${
                                    suspendAction === 'ARCHIVE' 
                                        ? 'border-blue-500 bg-blue-900 shadow-md' 
                                        : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                <div className="font-semibold text-gray-100">削除（退職など）</div>
                                <div className="text-sm text-gray-300 mt-1">
                                    ステータスは「アーカイブ」になります。6ヶ月間一覧にアーカイブとして表示され、6ヶ月後に削除になります。
                                </div>
                            </button>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setModalMode(null);
                                    setSelectedAccount(null);
                                    setSuspendAction(null);
                                }}
                                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-xl hover:bg-gray-500 transition-all duration-200 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSuspendAction}
                                disabled={!suspendAction}
                                className={`px-4 py-2 rounded-xl transition-all duration-200 font-semibold ${
                                    suspendAction
                                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                実行
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
