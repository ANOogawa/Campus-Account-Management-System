
import Link from 'next/link';
import { UserProfile } from '@/lib/auth';

interface SidebarProps {
    user: UserProfile | null;
    hasApprovals: boolean;
}

export default function Sidebar({ user, hasApprovals }: SidebarProps) {
    if (!user) {
        return (
            <aside className="w-64 bg-gray-800 text-white p-6">
                <p className="text-red-400 font-bold">ログインしていません</p>
            </aside>
        );
    }

    return (
        <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col shadow-lg">
            <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold tracking-wider">Acct Manager</h2>
                <div className="mt-4 text-sm text-gray-400">
                    <p>{user.last_name} {user.first_name}</p>
                    <p className="text-xs mt-1">{user.department}</p>
                </div>
            </div>

            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {/* Admin Menu */}
                    {user.is_admin && (
                        <>
                            <li>
                                <Link href="/admin/accounts" className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors">
                                    全アカウント一覧
                                </Link>
                            </li>
                            <li>
                                <Link href="/admin/settings" className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors">
                                    システム設定
                                </Link>
                            </li>
                        </>
                    )}

                    {/* Staff Menu */}
                    {user.employment_status === '正職員' && (
                        <li>
                            <Link href="/issue" className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors">
                                ゲストアカウント発行
                            </Link>
                        </li>
                    )}

                    {/* Approver Menu */}
                    {user.employment_status === '正職員' && hasApprovals && (
                        <li>
                            <Link href="/management" className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors">
                                承認中アカウント一覧
                            </Link>
                        </li>
                    )}

                    {/* Guest Menu */}
                    {user.employment_status === 'ゲスト' && (
                        <li>
                            <Link href="/extension" className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors">
                                利用期限延長申請
                            </Link>
                        </li>
                    )}

                    {/* No Menu Fallback (Optional, but spec says "show specific message") */}
                    {!user.is_admin && user.employment_status !== '正職員' && user.employment_status !== 'ゲスト' && (
                        <li className="px-4 py-2 text-gray-500">
                            表示できるメニューはありません
                        </li>
                    )}
                </ul>
            </nav>

            <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
                Internal System
            </div>
        </aside>
    );
}
