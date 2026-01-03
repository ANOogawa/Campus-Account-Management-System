import { OAuth2Client } from 'google-auth-library';
import { db } from './firebase';

const IAP_JWT_AUDIENCE = process.env.IAP_JWT_AUDIENCE || ''; // Project Number + Project ID usually

import { UserMaster } from '@/types/firestore';

export type UserProfile = UserMaster;

/**
 * Verify IAP JWT Assertion Header
 */
export async function verifyIapToken(iapJwt: string): Promise<string | null> {
    if (!iapJwt && process.env.NODE_ENV === 'development') {
        return process.env.NEXT_PUBLIC_MOCK_USER_EMAIL || 'ogawa@ogw3.com';
    }

    const oAuth2Client = new OAuth2Client();

    try {
        const response = await oAuth2Client.getIapPublicKeys();
        const ticket = await oAuth2Client.verifyIdToken({
            idToken: iapJwt,
            audience: IAP_JWT_AUDIENCE,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return null;
        }

        return payload.email;
    } catch (error) {
        console.warn('IAP Verification failed:', error);
        // For local development, if IAP is bypassed or not present, you might want a fallback
        if (process.env.NODE_ENV === 'development') {
            // Mock user for dev
            return process.env.NEXT_PUBLIC_MOCK_USER_EMAIL || 'ogawa@ogw3.com';
        }
        return null;
    }
}

/**
 * Get current authenticated user details from Firestore
 */
export async function getCurrentUser(email: string): Promise<UserMaster | null> {
    // Bypass Firestore in development for UI testing if no credentials
    if (process.env.NODE_ENV === 'development') {
        return {
            id: email,
            last_name: '管理者',
            first_name: 'テスト',
            department: '開発部',
            employment_status: '正職員', // Change to '正職員' to see issue menu, or 'ゲスト' etc.
            is_admin: true,
            updated_at: undefined
        };
    }

    try {
        const snapshot = await db.collection('user_master').doc(email).get(); // Use email as doc ID

        if (!snapshot.exists) {
            return null;
        }

        const data = snapshot.data();
        // Safe validation here would be better with Zod, but manual casting for now
        return {
            id: email,
            last_name: data?.last_name || '',
            first_name: data?.first_name || '',
            department: data?.department || '',
            employment_status: data?.employment_status || 'その他',
            is_admin: data?.is_admin || false
        };
    } catch (e) {
        console.warn("Firestore error (likely authentication):", e);
        return null;
    }
}
