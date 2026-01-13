'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserProfileSerializable } from '@/lib/auth';
import { useEffect, useState } from 'react';

interface SidebarProps {
    user: UserProfileSerializable | null;
    hasApprovals: boolean;
    isAuthenticatedButNotInMaster?: boolean;
    authenticatedEmail?: string;
    isOpen?: boolean;
    onToggle?: () => void;
}

export default function Sidebar({ user, hasApprovals, isAuthenticatedButNotInMaster = false, authenticatedEmail, isOpen = false, onToggle }: SidebarProps) {
    const [isUserViewMode, setIsUserViewMode] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // クライアントサイドでのみ実行
        const checkUserViewMode = () => {
            if (typeof window === 'undefined') return;
            const urlParams = new URLSearchParams(window.location.search);
            const userViewMode = sessionStorage.getItem('admin_user_view') === 'true' || urlParams.get('view') === 'user';
            setIsUserViewMode(userViewMode);
            if (userViewMode && user?.is_admin) {
                sessionStorage.setItem('admin_user_view', 'true');
            }
        };
        checkUserViewMode();
    }, [user]);

    // モバイルメニューの開閉を制御
    const handleToggle = () => {
        if (onToggle) {
            onToggle();
        }
    };

    // リンククリック時にモバイルメニューを閉じる
    const handleLinkClick = () => {
        if (onToggle) {
            onToggle();
        }
    };
    // User is authenticated but not in user_master
    if (isAuthenticatedButNotInMaster) {
        return (
            <>
                {/* オーバーレイ */}
                {isOpen && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                        onClick={handleToggle}
                    />
                )}
                <aside className={`fixed left-0 top-0 w-64 bg-slate-800 text-white p-6 flex flex-col shadow-xl border-r border-gray-700 z-50 h-screen transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold tracking-wider mb-4">Acct Manager</h2>
                        <p className="text-red-400 font-bold mb-4">あなたのアカウントはuser_masterに存在しません</p>
                        {authenticatedEmail && (
                            <p className="text-gray-400 text-sm mt-2">認証済みメール: {authenticatedEmail}</p>
                        )}
                    </div>
                    <div className="mt-auto">
                        <button
                            onClick={async () => {
                                await fetch('/api/auth/logout', { method: 'POST' });
                                window.location.href = '/login';
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-md"
                        >
                            ログアウト
                        </button>
                    </div>
                </aside>
            </>
        );
    }
    
    // User is not authenticated
    if (!user) {
        return (
            <>
                {/* オーバーレイ */}
                {isOpen && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                        onClick={handleToggle}
                    />
                )}
                <aside className={`fixed left-0 top-0 w-64 bg-slate-800 text-white p-6 flex flex-col shadow-xl border-r border-gray-700 z-50 h-screen transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold tracking-wider mb-4">Acct Manager</h2>
                        <p className="text-red-400 font-bold mb-4">ログインしていません</p>
                    </div>
                    <div className="mt-auto">
                        <button
                            onClick={() => {
                                window.location.href = '/login';
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-md"
                        >
                            ログイン
                        </button>
                    </div>
                </aside>
            </>
        );
    }

    return (
        <>
            {/* オーバーレイ */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={handleToggle}
                />
            )}
            <aside className={`fixed left-0 top-0 w-64 bg-slate-800 text-white h-screen flex flex-col shadow-xl border-r border-gray-700 z-50 transform transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0`}>
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold tracking-wider">Acct Manager</h2>
                    <div className="mt-4 text-sm text-gray-300">
                        <p className="font-medium">{user.last_name} {user.first_name}</p>
                        <p className="text-xs mt-1 text-gray-400">{user.department}</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto">
                    <ul className="space-y-2">
                        {/* Admin Menu */}
                        {user.is_admin && !isUserViewMode && (
                            <>
                                <li>
                                    <Link 
                                        href="/admin/accounts" 
                                        onClick={handleLinkClick}
                                        className={`block px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                            pathname === '/admin/accounts' 
                                                ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                                                : 'hover:bg-slate-700 text-gray-200'
                                        }`}
                                    >
                                        ゲストアカウント管理
                                    </Link>
                                </li>
                                <li>
                                    <Link 
                                        href="/admin/user-master" 
                                        onClick={handleLinkClick}
                                        className={`block px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                            pathname === '/admin/user-master' 
                                                ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                                                : 'hover:bg-slate-700 text-gray-200'
                                        }`}
                                    >
                                        管理ユーザー管理
                                    </Link>
                                </li>
                                <li>
                                    <Link 
                                        href="/admin/logs" 
                                        onClick={handleLinkClick}
                                        className={`block px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                            pathname === '/admin/logs' 
                                                ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                                                : 'hover:bg-slate-700 text-gray-200'
                                        }`}
                                    >
                                        ログ閲覧
                                    </Link>
                                </li>
                                <li>
                                    <Link 
                                        href="/admin/settings" 
                                        onClick={handleLinkClick}
                                        className={`block px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                            pathname === '/admin/settings' 
                                                ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                                                : 'hover:bg-slate-700 text-gray-200'
                                        }`}
                                    >
                                        システム設定
                                    </Link>
                                </li>
                            </>
                        )}

                        {/* Staff Menu */}
                        {(user.employment_status === '正職員' || (user.is_admin && isUserViewMode)) && (
                            <li>
                                <Link 
                                    href="/issue?view=user" 
                                    onClick={handleLinkClick}
                                    className={`block px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                        pathname === '/issue' 
                                            ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                                            : 'hover:bg-slate-700 text-gray-200'
                                    }`}
                                >
                                    ゲストアカウント発行
                                </Link>
                            </li>
                        )}

                        {/* Approver Menu */}
                        {(user.employment_status === '正職員' || (user.is_admin && isUserViewMode)) && (hasApprovals || user.is_admin) && (
                            <li>
                                <Link 
                                    href="/management?view=user" 
                                    onClick={handleLinkClick}
                                    className={`block px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                        pathname === '/management' 
                                            ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                                            : 'hover:bg-slate-700 text-gray-200'
                                    }`}
                                >
                                    承認中ゲストアカウント管理
                                </Link>
                            </li>
                        )}


                        {/* Guest Menu */}
                        {user.employment_status === 'ゲスト' && (
                            <li>
                                <Link 
                                    href="/extension" 
                                    onClick={handleLinkClick}
                                    className={`block px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                        pathname === '/extension' 
                                            ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                                            : 'hover:bg-slate-700 text-gray-200'
                                    }`}
                                >
                                    利用期限延長申請
                                </Link>
                            </li>
                        )}

                        {/* No Menu Fallback (Optional, but spec says "show specific message") */}
                        {!user.is_admin && user.employment_status !== '正職員' && user.employment_status !== 'ゲスト' && (
                            <li className="px-4 py-2 text-gray-400">
                                表示できるメニューはありません
                            </li>
                        )}
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-3">
                        Internal System
                    </div>
                    {/* Admin View Toggle Button */}
                    {user.is_admin && (
                        <button
                            onClick={() => {
                                if (isUserViewMode) {
                                    sessionStorage.removeItem('admin_user_view');
                                    window.location.href = '/admin/accounts';
                                } else {
                                    sessionStorage.setItem('admin_user_view', 'true');
                                    window.location.href = '/management?view=user';
                                }
                            }}
                            className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-xl transition-all duration-200 text-xs shadow-md"
                        >
                            {isUserViewMode ? '管理者ビューに戻る' : '通常ユーザービューに切り替え'}
                        </button>
                    )}
                    <button
                        onClick={async () => {
                            await fetch('/api/auth/logout', { method: 'POST' });
                            window.location.href = '/login';
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 text-sm shadow-md"
                    >
                        ログアウト
                    </button>
                </div>
            </aside>
        </>
    );
}
