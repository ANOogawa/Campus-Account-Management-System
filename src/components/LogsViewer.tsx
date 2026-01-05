
"use client";

import { useState, useEffect } from 'react';

interface UserMasterLog {
    id?: string;
    log_type: "user_master_change";
    action: "CREATE" | "UPDATE" | "DELETE";
    target_user_id: string;
    operator_id: string;
    operator_name: string;
    old_data?: any;
    new_data?: any;
    changed_fields?: string[];
    timestamp: string;
    description?: string;
}

interface SystemLog {
    id?: string;
    log_type: "issue" | "extend" | "delegate" | "extension_request";
    operator_id: string;
    operator_name: string;
    target_account_id?: string;
    data: Record<string, any>;
    timestamp: string;
    description?: string;
}

export default function LogsViewer() {
    const [activeTab, setActiveTab] = useState<'user_master' | 'system' | 'all'>('all');
    const [userMasterLogs, setUserMasterLogs] = useState<UserMasterLog[]>([]);
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, [activeTab]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const type = activeTab === 'all' ? 'all' : activeTab;
            const res = await fetch(`/api/admin/logs?type=${type}&limit=200`);
            
            if (!res.ok) {
                throw new Error('ログの取得に失敗しました');
            }

            const data = await res.json();
            
            if (activeTab === 'all') {
                setUserMasterLogs(data.user_master_logs || []);
                setSystemLogs(data.system_logs || []);
            } else if (activeTab === 'user_master') {
                setUserMasterLogs(data.logs || []);
                setSystemLogs([]);
            } else {
                setSystemLogs(data.logs || []);
                setUserMasterLogs([]);
            }
        } catch (error) {
            console.error('Failed to load logs:', error);
            alert('ログの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'CREATE': return '作成';
            case 'UPDATE': return '更新';
            case 'DELETE': return '削除';
            default: return action;
        }
    };

    const getLogTypeLabel = (logType: string) => {
        switch (logType) {
            case 'issue': return '発行';
            case 'extend': return '延長';
            case 'delegate': return '承認者変更';
            case 'extension_request': return '延長申請';
            default: return logType;
        }
    };

    return (
        <div>
            {/* タブ */}
            <div className="mb-4 border-b border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'all'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        }`}
                    >
                        すべてのログ
                    </button>
                    <button
                        onClick={() => setActiveTab('user_master')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'user_master'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        }`}
                    >
                        管理ユーザー変更履歴
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'system'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        }`}
                    >
                        ゲストアカウント変更履歴
                    </button>
                </nav>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-300">読み込み中...</div>
            ) : (
                <>
                    {/* 管理ユーザー変更履歴 */}
                    {(activeTab === 'all' || activeTab === 'user_master') && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4 text-gray-100">管理ユーザー変更履歴</h2>
                            <div className="bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-700">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead className="bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">日時</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">操作</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">操作者</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">対象ユーザー</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">変更内容</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                                            {userMasterLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                                                        ログがありません
                                                    </td>
                                                </tr>
                                            ) : (
                                                userMasterLogs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-gray-700 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                            {formatDate(log.timestamp)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg border ${
                                                                log.action === 'CREATE' ? 'bg-green-900 text-green-200 border-green-700' :
                                                                log.action === 'UPDATE' ? 'bg-blue-900 text-blue-200 border-blue-700' :
                                                                'bg-red-900 text-red-200 border-red-700'
                                                            }`}>
                                                                {getActionLabel(log.action)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                            {log.operator_name}<br />
                                                            <span className="text-xs text-gray-400">{log.operator_id}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                            {log.new_data ? `${log.new_data.last_name || ''} ${log.new_data.first_name || ''}` : 
                                                             log.old_data ? `${log.old_data.last_name || ''} ${log.old_data.first_name || ''}` : ''}
                                                            <br />
                                                            <span className="text-xs text-gray-400">{log.target_user_id}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-300">
                                                            {log.changed_fields && log.changed_fields.length > 0 ? (
                                                                <div>
                                                                    <div className="font-medium mb-1">変更フィールド:</div>
                                                                    <div className="text-xs">{log.changed_fields.join(', ')}</div>
                                                                </div>
                                                            ) : (
                                                                <div>{log.description || '-'}</div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ゲストアカウント変更履歴 */}
                    {(activeTab === 'all' || activeTab === 'system') && (
                        <div>
                            <h2 className="text-xl font-bold mb-4 text-gray-100">ゲストアカウント変更履歴</h2>
                            <div className="bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-700">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead className="bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">日時</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">種類</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">操作者</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">対象アカウント</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase">詳細</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                                            {systemLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                                                        ログがありません
                                                    </td>
                                                </tr>
                                            ) : (
                                                systemLogs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-gray-700 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                            {formatDate(log.timestamp)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg border bg-purple-900 text-purple-200 border-purple-700">
                                                                {getLogTypeLabel(log.log_type)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                            {log.operator_name}<br />
                                                            <span className="text-xs text-gray-400">{log.operator_id}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                            {log.target_account_id || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-300">
                                                            <div className="text-xs">
                                                                {Object.entries(log.data).map(([key, value]) => (
                                                                    <div key={key}>
                                                                        <span className="font-medium">{key}:</span> {String(value)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

