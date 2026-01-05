/**
 * 入力値の長さ制限を定義
 */
export const FIELD_MAX_LENGTHS = {
    email: 50,            // メールアドレス
    last_name: 20,         // 姓
    first_name: 20,        // 名
    department: 50,         // 所属
    usage_purpose: 200,    // 用途
} as const;

/**
 * バリデーションエラーメッセージ
 */
export interface ValidationError {
    field: string;
    message: string;
}

/**
 * 文字列の長さをチェック
 */
export function validateLength(value: string | undefined, maxLength: number, fieldName: string): ValidationError | null {
    if (value === undefined || value === null) {
        return null; // 必須チェックは別で行う
    }
    if (value.length > maxLength) {
        return {
            field: fieldName,
            message: `${fieldName}は${maxLength}文字以内で入力してください（現在: ${value.length}文字）`
        };
    }
    return null;
}

/**
 * メールアドレスの形式と長さをチェック
 */
export function validateEmail(email: string | undefined, fieldName: string = 'メールアドレス'): ValidationError | null {
    if (email === undefined || email === null) {
        return null; // 必須チェックは別で行う
    }
    
    const lengthError = validateLength(email, FIELD_MAX_LENGTHS.email, fieldName);
    if (lengthError) {
        return lengthError;
    }
    
    // 基本的なメールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            field: fieldName,
            message: '有効なメールアドレスを入力してください'
        };
    }
    
    return null;
}

/**
 * user_masterのデータをバリデーション
 */
export function validateUserMaster(data: {
    id?: string;
    last_name?: string;
    first_name?: string;
    department?: string;
}): ValidationError | null {
    const errors: ValidationError[] = [];
    
    if (data.id !== undefined) {
        const emailError = validateEmail(data.id, 'メールアドレス');
        if (emailError) errors.push(emailError);
    }
    
    if (data.last_name !== undefined) {
        const error = validateLength(data.last_name, FIELD_MAX_LENGTHS.last_name, '姓');
        if (error) errors.push(error);
    }
    
    if (data.first_name !== undefined) {
        const error = validateLength(data.first_name, FIELD_MAX_LENGTHS.first_name, '名');
        if (error) errors.push(error);
    }
    
    if (data.department !== undefined) {
        const error = validateLength(data.department, FIELD_MAX_LENGTHS.department, '所属');
        if (error) errors.push(error);
    }
    
    return errors.length > 0 ? errors[0] : null;
}

/**
 * guest_accountsのデータをバリデーション
 */
export function validateGuestAccount(data: {
    last_name?: string;
    first_name?: string;
    department?: string;
    usage_purpose?: string;
    approver_id?: string;
    approver_email?: string;
}): ValidationError | null {
    const errors: ValidationError[] = [];
    
    if (data.last_name !== undefined) {
        const error = validateLength(data.last_name, FIELD_MAX_LENGTHS.last_name, '姓');
        if (error) errors.push(error);
    }
    
    if (data.first_name !== undefined) {
        const error = validateLength(data.first_name, FIELD_MAX_LENGTHS.first_name, '名');
        if (error) errors.push(error);
    }
    
    if (data.department !== undefined) {
        const error = validateLength(data.department, FIELD_MAX_LENGTHS.department, '所属');
        if (error) errors.push(error);
    }
    
    if (data.usage_purpose !== undefined) {
        const error = validateLength(data.usage_purpose, FIELD_MAX_LENGTHS.usage_purpose, '用途');
        if (error) errors.push(error);
    }
    
    // approver_id または approver_email のチェック
    const approverEmail = data.approver_id || data.approver_email;
    if (approverEmail !== undefined) {
        const emailError = validateEmail(approverEmail, '承認者メールアドレス');
        if (emailError) errors.push(emailError);
    }
    
    return errors.length > 0 ? errors[0] : null;
}

