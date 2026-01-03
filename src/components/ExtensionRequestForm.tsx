"use client";

import { useState } from 'react';
import SuccessModal from './SuccessModal';

export default function ExtensionRequestForm({ currentExpiration, currentStatus }: { currentExpiration: string, currentStatus: string }) {
    const [selectedDate, setSelectedDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm('この日付で延長申請を行いますか？')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/extension', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requested_date: selectedDate })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '申請に失敗しました');
            }

            setSuccessMessage(`現在、${selectedDate} までの延長を申請中です。`);
            setShowSuccessModal(true);

            // Do not reload immediately, let user see the modal
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (currentStatus === '停止中') {
        return <div className="text-red-500">アカウントが停止されているため申請できません。</div>;
    }

    return (
        <div className="bg-white p-6 rounded shadow border border-gray-200 mt-6">
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    // Reload to reflect status change
                    window.location.reload();
                }}
                message={successMessage}
            />

            <h3 className="font-bold mb-4 text-gray-700">利用期限の延長申請</h3>
            <p className="text-sm text-gray-600 mb-4">希望する利用期限を選択してください。</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="date"
                        required
                        className="w-full md:w-1/2 border border-gray-300 rounded px-3 py-2"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || currentStatus === '延長申請中'}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? '送信中...' : '申請する'}
                </button>
                {currentStatus === '延長申請中' && (
                    <p className="text-xs text-gray-500 mt-2">※再申請すると希望日が上書きされます。</p>
                )}
            </form>
        </div>
    );
}
