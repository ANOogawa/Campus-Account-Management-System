
import { NextResponse } from 'next/server';
import { getSessionEmail, getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { UserMaster, EmploymentStatus } from '@/types/firestore';
import { logUserMasterChange } from '@/lib/logs';
import { validateUserMaster } from '@/lib/validation';

/**
 * user_master一覧を取得
 */
export async function GET() {
    try {
        const email = await getSessionEmail();
        
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser(email);
        
        if (!user || !user.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const snapshot = await db.collection('user_master').get();
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                last_name: data.last_name || '',
                first_name: data.first_name || '',
                department: data.department || '',
                employment_status: data.employment_status || 'その他',
                is_admin: data.is_admin || false,
                updated_at: data.updated_at ? data.updated_at.toDate().toISOString() : undefined
            };
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Get user_master error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * user_masterを作成
 */
export async function POST(request: Request) {
    try {
        const email = await getSessionEmail();
        
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser(email);
        
        if (!user || !user.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id, last_name, first_name, department, employment_status, is_admin } = body;

        // バリデーション
        if (!id || !last_name || !first_name || !department || !employment_status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 入力値の長さチェック
        const validationError = validateUserMaster({ id, last_name, first_name, department });
        if (validationError) {
            return NextResponse.json({ error: validationError.message }, { status: 400 });
        }

        if (!['正職員', 'ゲスト', 'その他'].includes(employment_status)) {
            return NextResponse.json({ error: 'Invalid employment_status' }, { status: 400 });
        }

        // 既存ユーザーのチェック
        const existingDoc = await db.collection('user_master').doc(id).get();
        if (existingDoc.exists) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        // ユーザーを作成
        const newUser: Omit<UserMaster, 'password_hash'> = {
            id,
            last_name,
            first_name,
            department,
            employment_status: employment_status as EmploymentStatus,
            is_admin: is_admin || false,
            updated_at: Timestamp.now()
        };

        await db.collection('user_master').doc(id).set(newUser);

        // ログに記録
        await logUserMasterChange(
            'CREATE',
            id,
            user.id,
            `${user.last_name} ${user.first_name}`,
            undefined,
            newUser
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Create user_master error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * user_masterを更新
 */
export async function PUT(request: Request) {
    try {
        const email = await getSessionEmail();
        
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getCurrentUser(email);
        
        if (!user || !user.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id, last_name, first_name, department, employment_status, is_admin } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
        }

        // 既存ユーザーを取得
        const userDoc = await db.collection('user_master').doc(id).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const oldData = userDoc.data() as UserMaster;

        // 入力値の長さチェック
        const validationError = validateUserMaster({ last_name, first_name, department });
        if (validationError) {
            return NextResponse.json({ error: validationError.message }, { status: 400 });
        }

        // 更新データを準備
        const updateData: Partial<UserMaster> = {
            updated_at: Timestamp.now()
        };

        if (last_name !== undefined) updateData.last_name = last_name;
        if (first_name !== undefined) updateData.first_name = first_name;
        if (department !== undefined) updateData.department = department;
        if (employment_status !== undefined) {
            if (!['正職員', 'ゲスト', 'その他'].includes(employment_status)) {
                return NextResponse.json({ error: 'Invalid employment_status' }, { status: 400 });
            }
            updateData.employment_status = employment_status as EmploymentStatus;
        }
        if (is_admin !== undefined) updateData.is_admin = is_admin;

        // 更新
        await db.collection('user_master').doc(id).update(updateData);

        // 更新後のデータを取得
        const updatedDoc = await db.collection('user_master').doc(id).get();
        const newData = updatedDoc.data() as UserMaster;

        // ログに記録
        await logUserMasterChange(
            'UPDATE',
            id,
            user.id,
            `${user.last_name} ${user.first_name}`,
            oldData,
            newData
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update user_master error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * user_masterを削除
 */
export async function DELETE(request: Request) {
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
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
        }

        // 自分自身を削除しようとしている場合は拒否
        if (id === user.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        // 既存ユーザーを取得（ログ用）
        const userDoc = await db.collection('user_master').doc(id).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const oldData = userDoc.data() as UserMaster;

        // 削除
        await db.collection('user_master').doc(id).delete();

        // ログに記録
        await logUserMasterChange(
            'DELETE',
            id,
            user.id,
            `${user.last_name} ${user.first_name}`,
            oldData,
            undefined
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user_master error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}




