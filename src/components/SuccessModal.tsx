
import React from 'react';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
}

export default function SuccessModal({ isOpen, onClose, title = "完了", message }: SuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center transform transition-all scale-100">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-900 mb-4">
                    <svg className="h-6 w-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-100 mb-2">
                    {title}
                </h3>
                <div className="mt-2 text-center">
                    <p className="text-sm text-gray-300">
                        {message}
                    </p>
                </div>
                <div className="mt-6">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-md px-4 py-2.5 bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-all duration-200 sm:text-sm"
                        onClick={onClose}
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
}
