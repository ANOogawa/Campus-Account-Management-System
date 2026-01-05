import { NextResponse } from 'next/server';
import { authenticateUser, createSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'メールアドレスとパスワードを入力してください' },
                { status: 400 }
            );
        }

        // 認証
        const user = await authenticateUser(email, password);

        if (!user) {
            return NextResponse.json(
                { error: 'メールアドレスまたはパスワードが正しくありません' },
                { status: 401 }
            );
        }

        // セッション作成
        await createSession(email);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                last_name: user.last_name,
                first_name: user.first_name,
                department: user.department,
                employment_status: user.employment_status,
                is_admin: user.is_admin
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { error: 'ログインに失敗しました' },
            { status: 500 }
        );
    }
}






