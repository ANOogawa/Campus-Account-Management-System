"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMaster as UserProfile } from '@/types/firestore';
import SuccessModal from './SuccessModal';
import { FIELD_MAX_LENGTHS, validateGuestAccount } from '@/lib/validation';


interface GuestIssueFormProps {
    currentUser: UserProfile;
}

export default function GuestIssueForm({ currentUser }: GuestIssueFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Array of guests to issue
    const [guests, setGuests] = useState([
        {
            last_name: '',
            first_name: '',
            department: currentUser.department || '',
            usage_purpose: '',
            approver_email: currentUser.id,
            expiration_date: ''
        }
    ]);

    const addGuest = () => {
        const lastGuest = guests[guests.length - 1];
        setGuests([
            ...guests,
            {
                last_name: '',
                first_name: '',
                department: lastGuest.department,
                usage_purpose: lastGuest.usage_purpose,
                approver_email: lastGuest.approver_email,
                expiration_date: lastGuest.expiration_date
            }
        ]);
    };

    const removeGuest = (index: number) => {
        if (guests.length > 1) {
            setGuests(guests.filter((_, i) => i !== index));
        }
    };

    const handleChange = (index: number, field: string, value: string) => {
        const newGuests = [...guests];
        newGuests[index] = { ...newGuests[index], [field]: value };
        setGuests(newGuests);
    };

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<any[] | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        // フロントエンドバリデーション
        for (const guest of guests) {
            const validationError = validateGuestAccount({
                last_name: guest.last_name,
                first_name: guest.first_name,
                department: guest.department,
                usage_purpose: guest.usage_purpose,
                approver_email: guest.approver_email
            });
            if (validationError) {
                setError(validationError.message);
                setLoading(false);
                return;
            }
        }

        try {
            const token = localStorage.getItem('iap_token') || ''; // Fallback for dev
            const res = await fetch('/api/issue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // In real IAP this is handled by browser cookies usually, but we might verify header
                },
                body: JSON.stringify({ guests })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '発行処理に失敗しました');
            }

            const data = await res.json();
            setResults(data.result);
            setShowSuccessModal(true); // Show success modal

            // Reset form (keep first entry but clear dynamic values if needed, or just keep as is to show result)
            // For now, keeping results distinct from form reset

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
        // Optional: Reset form or redirect
        window.location.reload(); // Refresh to clear form clearly
    };

    return (
        <div className="space-y-8">
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleCloseModal}
                message="ゲストアカウントの発行が完了しました。"
            />

            {error && (
                <div className="bg-red-900 text-red-200 p-4 rounded-xl mb-4 border border-red-700">
                    {error}
                </div>
            )}

            {results && (
                <div className="bg-green-900 p-4 rounded-xl mb-4 border border-green-700">
                    <h3 className="font-bold text-green-200 mb-2">発行結果:</h3>
                    <ul className="list-disc pl-5 text-green-300 text-sm">
                        {results.map((r, i) => (
                            <li key={i}>{r.id} ({r.name}) - {r.status}</li>
                        ))}
                    </ul>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {guests.map((guest, index) => (
                    <div key={index} className="bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-700 relative">
                        <h3 className="font-bold mb-4 text-gray-100">アカウント #{index + 1}</h3>

                        {guests.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeGuest(index)}
                                className="absolute top-4 right-4 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                            >
                                削除
                            </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">姓</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={FIELD_MAX_LENGTHS.last_name}
                                    className="mt-1 block w-full border border-gray-600 bg-gray-700 rounded-xl px-3 py-2.5 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={guest.last_name}
                                    onChange={(e) => handleChange(index, 'last_name', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">名</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={FIELD_MAX_LENGTHS.first_name}
                                    className="mt-1 block w-full border border-gray-600 bg-gray-700 rounded-xl px-3 py-2.5 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={guest.first_name}
                                    onChange={(e) => handleChange(index, 'first_name', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">所属 (利用者)</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={FIELD_MAX_LENGTHS.department}
                                    className="mt-1 block w-full border border-gray-600 bg-gray-700 rounded-xl px-3 py-2.5 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={guest.department}
                                    onChange={(e) => handleChange(index, 'department', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">用途</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={FIELD_MAX_LENGTHS.usage_purpose}
                                    className="mt-1 block w-full border border-gray-600 bg-gray-700 rounded-xl px-3 py-2.5 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={guest.usage_purpose}
                                    onChange={(e) => handleChange(index, 'usage_purpose', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">承認者メールアドレス</label>
                                <input
                                    type="email"
                                    required
                                    maxLength={FIELD_MAX_LENGTHS.email}
                                    className="mt-1 block w-full border border-gray-600 bg-gray-700 rounded-xl px-3 py-2.5 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={guest.approver_email}
                                    onChange={(e) => handleChange(index, 'approver_email', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">利用期限 (最大3ヶ月)</label>
                                <input
                                    type="date"
                                    required
                                    className="mt-1 block w-full border border-gray-600 bg-gray-700 rounded-xl px-3 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={guest.expiration_date}
                                    onChange={(e) => handleChange(index, 'expiration_date', e.target.value)}
                                    max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={addGuest}
                        className="bg-gray-600 text-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-500 transition-all duration-200 font-medium shadow-sm"
                    >
                        ＋ 一人追加
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 font-semibold shadow-md"
                    >
                        {loading ? '発行中...' : '発行する'}
                    </button>
                </div>
            </form>
        </div>
    );
}

