
import { NextResponse } from 'next/server';
import { getSessionEmail, getCurrentUser } from '@/lib/auth';
import { getUserMasterLogs, getSystemLogs } from '@/lib/logs';

/**
 * ログ一覧を取得
 */
export async function GET(request: Request) {
    try {
        const email = await getSessionEmail();
        
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser(email);
        
        if (!user || !user.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const logType = searchParams.get('type') || 'all';
        const limit = parseInt(searchParams.get('limit') || '100');

        if (logType === 'user_master') {
            const userMasterLogs = await getUserMasterLogs(limit);
            return NextResponse.json({ logs: userMasterLogs.map(log => ({
                ...log,
                timestamp: log.timestamp.toDate().toISOString()
            })) });
        }

        if (logType === 'system') {
            const systemLogs = await getSystemLogs(limit);
            return NextResponse.json({ logs: systemLogs.map(log => ({
                ...log,
                timestamp: log.timestamp.toDate().toISOString()
            })) });
        }

        // all の場合は両方返す
        const [userMasterLogs, systemLogs] = await Promise.all([
            getUserMasterLogs(limit),
            getSystemLogs(limit)
        ]);

        return NextResponse.json({
            user_master_logs: userMasterLogs.map(log => ({
                ...log,
                timestamp: log.timestamp.toDate().toISOString()
            })),
            system_logs: systemLogs.map(log => ({
                ...log,
                timestamp: log.timestamp.toDate().toISOString()
            }))
        });
    } catch (error) {
        console.error('Get logs error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

