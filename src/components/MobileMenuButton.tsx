'use client';

interface MobileMenuButtonProps {
    onClick: () => void;
    isOpen: boolean;
}

export default function MobileMenuButton({ onClick, isOpen }: MobileMenuButtonProps) {
    return (
        <button
            onClick={onClick}
            className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
            aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
        >
            {isOpen ? (
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            ) : (
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                    />
                </svg>
            )}
        </button>
    );
}

