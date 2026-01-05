import { NextResponse } from 'next/server';
import { getSessionEmail, getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const email = await getSessionEmail();
        
        if (!email) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        const user = await getCurrentUser(email);
        
        if (!user) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        return NextResponse.json({ 
            authenticated: true,
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
        console.error('Auth check error:', error);
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}






