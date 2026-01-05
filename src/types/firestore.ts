
import { Timestamp } from 'firebase-admin/firestore';

export type EmploymentStatus = "正職員" | "ゲスト" | "その他";
export type AccountStatus = "利用中" | "停止中" | "申請中" | "延長申請中" | "アーカイブ" | "削除";

export interface UserMaster {
    id: string; // Email
    last_name: string;
    first_name: string;
    department: string;
    employment_status: EmploymentStatus;
    is_admin: boolean;
    password_hash?: string; // パスワードハッシュ（オプション、既存ユーザー用）
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
    archived_at?: Timestamp; // アーカイブ日時（削除処理時に記録）
}

// ログ関連の型定義
export type LogType = "user_master_change" | "issue" | "extend" | "delegate" | "extension_request" | "suspend" | "archive" | "restore";

export interface UserMasterLog {
    id?: string; // Document ID
    log_type: "user_master_change";
    action: "CREATE" | "UPDATE" | "DELETE";
    target_user_id: string; // 変更対象のユーザーID
    operator_id: string; // 操作者ID
    operator_name: string; // 操作者名
    old_data?: Partial<UserMaster>; // 変更前のデータ（UPDATE/DELETE時）
    new_data?: Partial<UserMaster>; // 変更後のデータ（CREATE/UPDATE時）
    changed_fields?: string[]; // 変更されたフィールド名の配列
    timestamp: Timestamp;
    description?: string; // 追加の説明
}

export interface SystemLog {
    id?: string; // Document ID
    log_type: "issue" | "extend" | "delegate" | "extension_request" | "suspend" | "archive" | "restore";
    operator_id: string; // 操作者ID
    operator_name: string; // 操作者名
    target_account_id?: string; // 対象アカウントID
    data: Record<string, any>; // ログ固有のデータ
    timestamp: Timestamp;
    description?: string; // 追加の説明
}
