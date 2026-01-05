import { db } from './firebase';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { UserMaster, EmploymentStatus } from '@/types/firestore';

export type UserProfile = UserMaster;

// Client Componentに渡すためのシリアライズ可能なUserProfile型
export type UserProfileSerializable = {
    id: string;
    last_name: string;
    first_name: string;
    department: string;
    employment_status: EmploymentStatus;
    is_admin: boolean;
};

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7日間

/**
 * セッションから現在のユーザーメールアドレスを取得
 */
export async function getSessionEmail(): Promise<string | null> {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionToken) {
        return null;
    }

    // セッショントークンはメールアドレスをそのまま使用（簡易実装）
    // 本番環境ではJWTやセッションストアを使用することを推奨
    try {
        // セッショントークンの検証（必要に応じてJWT検証などに変更）
        return sessionToken;
    } catch (error) {
        console.error('[Auth] Session validation failed:', error);
        return null;
    }
}

/**
 * セッションを作成
 */
export async function createSession(email: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
    });
}

/**
 * セッションを削除
 */
export async function deleteSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * パスワードをハッシュ化
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * パスワードを検証
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

/**
 * メールアドレスから初期パスワードを生成（@の前の文字列）
 */
export function generateInitialPassword(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
        throw new Error('Invalid email format');
    }
    return email.substring(0, atIndex);
}

/**
 * ログイン認証
 */
export async function authenticateUser(email: string, password: string): Promise<UserMaster | null> {
    try {
        const snapshot = await db.collection('user_master').doc(email).get();

        if (!snapshot.exists) {
            console.warn('[Auth] User not found in Firestore:', email);
            return null;
        }

        const data = snapshot.data();
        if (!data) {
            return null;
        }

        // パスワードハッシュが存在しない場合（既存ユーザー）、初期パスワードを設定
        if (!data.password_hash) {
            const initialPassword = generateInitialPassword(email);
            const isInitialPassword = password === initialPassword;
            
            if (!isInitialPassword) {
                console.warn('[Auth] Invalid password for user without hash:', email);
                return null;
            }
            
            // 初期パスワードが正しい場合、ハッシュを保存
            const hashedPassword = await hashPassword(initialPassword);
            await db.collection('user_master').doc(email).update({
                password_hash: hashedPassword
            });
            
            // ユーザー情報を返す
            return {
                id: email,
                last_name: data.last_name || '',
                first_name: data.first_name || '',
                department: data.department || '',
                employment_status: data.employment_status || 'その他',
                is_admin: data.is_admin || false,
                password_hash: hashedPassword,
                updated_at: data.updated_at
            };
        }

        // パスワード検証
        const isValidPassword = await verifyPassword(password, data.password_hash);
        if (!isValidPassword) {
            console.warn('[Auth] Invalid password for user:', email);
            return null;
        }

        // ユーザー情報を返す
        return {
            id: email,
            last_name: data.last_name || '',
            first_name: data.first_name || '',
            department: data.department || '',
            employment_status: data.employment_status || 'その他',
            is_admin: data.is_admin || false,
            password_hash: data.password_hash,
            updated_at: data.updated_at
        };
    } catch (e) {
        console.error("[Auth] Firestore error:", e);
        return null;
    }
}

/**
 * Get current authenticated user details from Firestore
 */
export async function getCurrentUser(email: string): Promise<UserMaster | null> {
    try {
        console.log('[Auth] Fetching user from Firestore:', email);
        const snapshot = await db.collection('user_master').doc(email).get();

        if (!snapshot.exists) {
            console.warn('[Auth] User not found in Firestore:', email);
            return null;
        }

        const data = snapshot.data();
        console.log('[Auth] User data retrieved:', { email, department: data?.department });
        return {
            id: email,
            last_name: data?.last_name || '',
            first_name: data?.first_name || '',
            department: data?.department || '',
            employment_status: data?.employment_status || 'その他',
            is_admin: data?.is_admin || false,
            password_hash: data?.password_hash,
            updated_at: data?.updated_at
        };
    } catch (e) {
        console.error("[Auth] Firestore error:", e);
        return null;
    }
}
