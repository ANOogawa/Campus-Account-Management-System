'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import MobileMenuButton from './MobileMenuButton';
import { UserProfileSerializable } from '@/lib/auth';

interface MobileLayoutProps {
    children: React.ReactNode;
    user: UserProfileSerializable | null;
    hasApprovals: boolean;
    isAuthenticatedButNotInMaster: boolean;
    authenticatedEmail?: string;
}

export default function MobileLayout({
    children,
    user,
    hasApprovals,
    isAuthenticatedButNotInMaster,
    authenticatedEmail,
}: MobileLayoutProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleToggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <>
            <MobileMenuButton onClick={handleToggleMenu} isOpen={isMenuOpen} />
            <Sidebar
                user={user}
                hasApprovals={hasApprovals}
                isAuthenticatedButNotInMaster={isAuthenticatedButNotInMaster}
                authenticatedEmail={authenticatedEmail}
                isOpen={isMenuOpen}
                onToggle={handleToggleMenu}
            />
            <main className="flex-1 overflow-y-auto bg-gray-900 ml-0 md:ml-64 min-h-screen pt-16 md:pt-0">
                {children}
            </main>
        </>
    );
}

