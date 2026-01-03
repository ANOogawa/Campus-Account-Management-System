
import { Timestamp } from 'firebase-admin/firestore';

export type EmploymentStatus = "正職員" | "ゲスト" | "その他";
export type AccountStatus = "利用中" | "停止中" | "申請中" | "延長申請中";

export interface UserMaster {
    id: string; // Email
    last_name: string;
    first_name: string;
    department: string;
    employment_status: EmploymentStatus;
    is_admin: boolean;
    // added for tracking spreadsheet sync if needed, though spec says 1 hour sync
    updated_at?: Timestamp;
}

export interface GuestAccount {
    id: string; // generated email
    last_name: string;
    first_name: string;
    department: string;
    usage_purpose: string;
    approver_id: string; // Email of approver
    expiration_date: Timestamp;
    status: AccountStatus;
    requested_expiration_date?: Timestamp | null;
    last_updated_date: Timestamp;
    created_at?: Timestamp;
    created_by?: string;
}
