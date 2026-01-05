import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
    try {
        await deleteSession();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout Error:', error);
        return NextResponse.json(
            { error: 'ログアウトに失敗しました' },
            { status: 500 }
        );
    }
}






