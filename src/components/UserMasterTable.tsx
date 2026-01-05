"use client";

import { useState, useEffect, useMemo } from 'react';
import SuccessModal from './SuccessModal';
import { FIELD_MAX_LENGTHS, validateUserMaster } from '@/lib/validation';

export interface UserMasterSerializable {
    id: string;
    last_name: string;
    first_name: string;
    department: string;
    employment_status: "正職員" | "ゲスト" | "その他";
    is_admin: boolean;
    updated_at?: string;
}

interface UserMasterTableProps {
    initialUsers: UserMasterSerializable[];
    currentUserEmail: string;
}

type SortColumn = 'id' | 'last_name' | 'first_name' | 'department' | 'employment_status' | 'is_admin' | 'updated_at';
type SortDirection = 'asc' | 'desc';

export default function UserMasterTable({ initialUsers, currentUserEmail }: UserMasterTableProps) {
    const [sortColumn, setSortColumn] = useState<SortColumn>('id');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [users, setUsers] = useState(initialUsers);
    const [filterDepartment, setFilterDepartment] = useState<string>('');
    const [filterEmploymentStatus, setFilterEmploymentStatus] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<UserMasterSerializable | null>(null);
    const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // フィルターオプションを取得
    const departmentOptions = useMemo(() => {
        const departments = new Set(users.map(user => user.department).filter(Boolean));
        return Array.from(departments).sort();
    }, [users]);
    
    // フィルターされたユーザーリスト
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            if (filterDepartment && user.department !== filterDepartment) return false;
            if (filterEmploymentStatus && user.employment_status !== filterEmploymentStatus) return false;
            return true;
        });
    }, [users, filterDepartment, filterEmploymentStatus]);
    
    // ソートされたユーザーリスト
    const sortedUsers = useMemo(() => {
        const sorted = [...filteredUsers].sort((a, b) => {
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
                case 'employment_status':
                    aValue = a.employment_status;
                    bValue = b.employment_status;
                    break;
                case 'is_admin':
                    aValue = a.is_admin ? 1 : 0;
                    bValue = b.is_admin ? 1 : 0;
                    break;
                case 'updated_at':
                    aValue = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    bValue = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }, [filteredUsers, sortColumn, sortDirection]);
    
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

    // フォーム状態
    const [formData, setFormData] = useState({
        id: '',
        last_name: '',
        first_name: '',
        department: '',
        employment_status: '正職員' as "正職員" | "ゲスト" | "その他",
        is_admin: false
    });

    // モーダルを開く
    const openCreateModal = () => {
        setModalMode('CREATE');
        setFormData({
            id: '',
            last_name: '',
            first_name: '',
            department: '',
            employment_status: '正職員',
            is_admin: false
        });
        setSelectedUser(null);
    };

    const openEditModal = (user: UserMasterSerializable) => {
        setModalMode('EDIT');
        setSelectedUser(user);
        setFormData({
            id: user.id,
            last_name: user.last_name,
            first_name: user.first_name,
            department: user.department,
            employment_status: user.employment_status,
            is_admin: user.is_admin
        });
    };

    // ユーザー作成
    const handleCreate = async () => {
        if (!formData.id || !formData.last_name || !formData.first_name || !formData.department) {
            alert('必須項目を入力してください');
            return;
        }

        // バリデーション
        const validationError = validateUserMaster({
            id: formData.id,
            last_name: formData.last_name,
            first_name: formData.first_name,
            department: formData.department
        });
        if (validationError) {
            alert(validationError.message);
            return;
        }

        try {
            const res = await fetch('/api/admin/user-master', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '作成に失敗しました');
            }

            setSuccessMessage('ユーザーを作成しました');
            setShowSuccessModal(true);
            setModalMode(null);
            
            // リストを更新
            const refreshRes = await fetch('/api/admin/user-master');
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                setUsers(data.users);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    // ユーザー更新
    const handleUpdate = async () => {
        if (!selectedUser || !formData.last_name || !formData.first_name || !formData.department) {
            alert('必須項目を入力してください');
            return;
        }

        // バリデーション
        const validationError = validateUserMaster({
            last_name: formData.last_name,
            first_name: formData.first_name,
            department: formData.department
        });
        if (validationError) {
            alert(validationError.message);
            return;
        }

        try {
            const res = await fetch('/api/admin/user-master', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: selectedUser.id,
                    ...Object.fromEntries(Object.entries(formData).filter(([key]) => key !== 'id'))
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '更新に失敗しました');
            }

            setSuccessMessage('ユーザーを更新しました');
            setShowSuccessModal(true);
            setModalMode(null);
            
            // リストを更新
            const refreshRes = await fetch('/api/admin/user-master');
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                setUsers(data.users);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    // ユーザー削除
    const handleDelete = async (user: UserMasterSerializable) => {
        if (!confirm(`ユーザー「${user.last_name} ${user.first_name} (${user.id})」を削除しますか？`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/user-master?id=${encodeURIComponent(user.id)}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '削除に失敗しました');
            }

            setSuccessMessage('ユーザーを削除しました');
            setShowSuccessModal(true);
            
            // リストを更新
            const refreshRes = await fetch('/api/admin/user-master');
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                setUsers(data.users);
            }
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
                    window.location.reload();
                }}
                message={successMessage}
            />

            <div className="mb-4">
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-md"
                >
                    + ユーザーを追加
                </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 overflow-hidden rounded-2xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700 table-fixed">
                        <colgroup>
                            <col className="w-[10%]" />
                            <col className="w-[20%]" />
                            <col className="w-[12%]" />
                            <col className="w-[15%]" />
                            <col className="w-[10%]" />
                            <col className="w-[10%]" />
                            <col className="w-[23%]" />
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
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('employment_status')}
                                        >
                                            雇用形態 <SortIcon column="employment_status" />
                                        </span>
                                        <select
                                            className="w-full text-xs px-1 py-0.5 border border-gray-500 rounded bg-gray-600 text-gray-200 focus:bg-gray-500 focus:outline-none"
                                            value={filterEmploymentStatus}
                                            onChange={(e) => setFilterEmploymentStatus(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">すべて</option>
                                            <option value="正職員">正職員</option>
                                            <option value="ゲスト">ゲスト</option>
                                            <option value="その他">その他</option>
                                        </select>
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('is_admin')}
                                        >
                                            管理者 <SortIcon column="is_admin" />
                                        </span>
                                        <div className="h-[20px] text-xs px-1 py-0.5"></div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-tight">
                                    <div className="flex flex-col gap-1">
                                        <span 
                                            className="cursor-pointer hover:text-gray-100 select-none"
                                            onClick={() => handleSort('updated_at')}
                                        >
                                            最終更新 <SortIcon column="updated_at" />
                                        </span>
                                        <div className="h-[20px] text-xs px-1 py-0.5"></div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {sortedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-2 py-4 text-center text-xs text-gray-400">
                                        ユーザーが登録されていません
                                    </td>
                                </tr>
                            ) : (
                                sortedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-700 transition-colors">
                                        <td className="px-2 py-2 text-xs text-gray-400">
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="px-2 py-1 bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition-all duration-200 text-center border-0 rounded-lg shadow-sm"
                                                >
                                                    編集
                                                </button>
                                                {user.id !== currentUserEmail && (
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="px-2 py-1 bg-red-600 text-white text-xs hover:bg-red-700 transition-all duration-200 text-center border-0 rounded-lg shadow-sm"
                                                    >
                                                        削除
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-xs font-medium text-gray-200 break-words">
                                            {user.id}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                            {user.last_name} {user.first_name}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                            {user.department}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                            {user.employment_status}
                                        </td>
                                        <td className="px-2 py-2 text-xs break-words">
                                            {user.is_admin ? (
                                                <span className="px-2 py-1 inline-flex text-xs leading-tight font-semibold bg-red-900 text-red-200 border border-red-700 rounded-lg">
                                                    管理者
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-300 break-words">
                                            {user.updated_at ? new Date(user.updated_at).toLocaleString('ja-JP') : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 作成/編集モーダル */}
            {modalMode && (
                <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-xl w-96 max-h-[90vh] overflow-y-auto">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-100">
                                {modalMode === 'CREATE' ? 'ユーザーを追加' : 'ユーザーを編集'}
                            </h3>
                        </div>

                        <div className="mb-4 space-y-4">
                            {modalMode === 'CREATE' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">メールアドレス *</label>
                                    <input
                                        type="email"
                                        maxLength={FIELD_MAX_LENGTHS.email}
                                        className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        value={formData.id}
                                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                        placeholder="user@example.com"
                                    />
                                </div>
                            )}
                            {modalMode === 'EDIT' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">メールアドレス</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-400"
                                        value={formData.id}
                                        disabled
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">姓 *</label>
                                <input
                                    type="text"
                                    maxLength={FIELD_MAX_LENGTHS.last_name}
                                    className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">名 *</label>
                                <input
                                    type="text"
                                    maxLength={FIELD_MAX_LENGTHS.first_name}
                                    className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">所属 *</label>
                                <input
                                    type="text"
                                    maxLength={FIELD_MAX_LENGTHS.department}
                                    className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">雇用形態 *</label>
                                <select
                                    className="w-full border border-gray-600 bg-gray-700 p-2.5 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={formData.employment_status}
                                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value as "正職員" | "ゲスト" | "その他" })}
                                >
                                    <option value="正職員">正職員</option>
                                    <option value="ゲスト">ゲスト</option>
                                    <option value="その他">その他</option>
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="mr-2"
                                        checked={formData.is_admin}
                                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-300">管理者権限</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setModalMode(null)}
                                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-xl hover:bg-gray-500 transition-all duration-200 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={modalMode === 'CREATE' ? handleCreate : handleUpdate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-md"
                            >
                                {modalMode === 'CREATE' ? '作成' : '更新'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

