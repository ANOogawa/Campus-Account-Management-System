import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { getSessionEmail, getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        // 1. Auth Check
        const email = await getSessionEmail();

        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await getCurrentUser(email);
        if (!currentUser || currentUser.employment_status !== "正職員") {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { userEmail } = body;

        if (!userEmail) {
            return NextResponse.json({ error: 'メールアドレスが指定されていません' }, { status: 400 });
        }

        // Check if user exists
        const userRef = await db.collection('user_master').doc(userEmail).get();
        if (!userRef.exists) {
            return NextResponse.json({ 
                error: '指定されたメールアドレスのユーザーが見つかりませんでした',
                found: false 
            }, { status: 404 });
        }

        const userData = userRef.data();
        if (!userData) {
            return NextResponse.json({ 
                error: 'ユーザー情報の取得に失敗しました',
                found: false 
            }, { status: 500 });
        }

        // Check if user is staff
        if (userData.employment_status !== '正職員') {
            return NextResponse.json({ 
                error: '指定されたユーザーは正職員ではありません。正職員のみ承認者として指定できます。',
                found: false 
            }, { status: 400 });
        }

        return NextResponse.json({
            found: true,
            user: {
                id: userEmail,
                last_name: userData.last_name || '',
                first_name: userData.first_name || '',
                department: userData.department || '',
                employment_status: userData.employment_status || 'その他'
            }
        });

    } catch (error) {
        console.error('Check User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}



