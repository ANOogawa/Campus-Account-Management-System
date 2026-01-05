<<<<<<< HEAD
# 背景
## 1. 前提
- **ユーザの種類:** 
    - **管理者:** アカウントの管理者
    - **正職員:** 人事情報に登録されている人
    - **人事情報に載らない職員:** 人事情報に登録されないがアカウントが必要な人
    
## 2. 背景
- 人事情報に載らない職員（派遣、アルバイトなど）のゲストアカウント発行・管理できるシステム
    - 現状
        - 発行: 正職員は自分の責任下で、ゲストアカウントを発行できる。
            1. 正職員がGoogleフォームでアカウントの利用申請
            2. 管理者側でアカウント発行

        - 管理: 年に一度、アカウントが利用されているか確認する必要がある。
            1. 承認者（作成者）毎にスプレッドシートでゲストアカウントの一覧を作成
            2. スプレッドシートを承認者に共有し、アカウントのステータスを入力してもらう
            3. 入力結果を確認し、状態に応じてアカウントを更新（利用中、停止、承認者の変更、等）

        - 問題点
            - 即時発行できない。
            - 年に一度しか、更新できない。自分が承認しているアカウントを確認できない。
            - ユーザ、管理者共に手間がかかる。

    - システムで解決
        - 発行、更新を行いたい時に管理者を介さず処理可能
        - いつでも自分が承認しているアカウントを確認可能
        - 管理者はアカウントの一覧やログを確認可能

# プロジェクト仕様書
## 1. 概要
組織内の一時的なGoogleアカウント（ゲストアカウント）を管理する利用者向けのインターフェース。
他の機能も実装予定のため、拡張性を持たせること。

## 2. 技術スタック
- **フレームワーク:** Next.js 16.1.1 (App Router)
- **言語:** TypeScript (Strict mode)
- **スタイリング:** Tailwind CSS 4
- **データベース:** Cloud Firestore
- **外部連携:** Google Sheets API, Admin SDK (Directory API)
- **認証:** Identity-Aware Proxy (IAP) + アプリ独自の認可ロジック
- **デプロイ:** Cloud Run (Docker)

## 3. コーディング規約
- **変数名・DBのキー:** 英語 (camelCase または snake_case)
    - *理由:* JSON/JWTの互換性と、AIの解釈精度を高めるため。
- **型定義・コメント・UIの表示:** 日本語
    - *理由:* 開発者とユーザーにとっての可読性を確保するため。
- **ディレクトリ構造:**
    - `app/`: ルーティングと各ページ
    - `components/`: 再利用可能なUIパーツ
    - `lib/`: 共通ロジック (Firebase設定, IAP検証など)
    - `types/`: TypeScriptの型定義

## 4. セキュリティと認証
- **IAP検証:** バックエンド側で必ず `x-goog-iap-jwt-assertion` ヘッダーを検証し、IAPを回避したアクセスを防ぐこと。
- **認可フロー:**
    - **Step 1:** IAPによるドメイン/グループ制限（インフラ層）。
    - **Step 2:** アプリ層でFirestoreの `user_master` コレクションを参照。
        - `user_master` に存在しないユーザはログインを拒否した上で "あなたのアカウントは`user_master`に存在しません" を表示。
- **開発環境:** 開発モードでは `NEXT_PUBLIC_MOCK_USER_EMAIL` 環境変数でモックユーザーを使用可能。

## 5. データモデル
基本的にはFirestore側で処理します。
ゲストアカウント関連のログはスプレッドシートにも記録されます。
スプレッドシートID: `1WDJvweOGdqOkZjkR6yyMYtnRxaJUvxrF1TFHkzLpmAQ`

### ユーザマスタ
ログイン時に使用するデータ。
- **Firestore側:** (読み書き)
    - Collection: `user_master`
    - Document ID: メールアドレス
    - `id` : string (メールアドレス)
    - `last_name`: string (姓)
    - `first_name`: string (名)
    - `department`: string (所属)
    - `employment_status`: "正職員" | "ゲスト" | "その他"
    - `is_admin`: boolean (システム管理者フラグ)
    - `updated_at`: Timestamp (オプション)

### ゲストアカウント一覧
管理対象であるゲストアカウントの詳細データ。
- **Firestore側:** (読み書き)
    - Collection: `guest_accounts`
    - Document ID: メールアドレス (例: `gst-0001@ogw3.com`)
    - `id` : string (メールアドレス)
    - `last_name`: string (姓)
    - `first_name`: string (名)
    - `department`: string (所属)
    - `usage_purpose`: string (用途)
    - `approver_id`: string (承認者アドレス - `user_master`と紐付け)
    - `expiration_date`: Timestamp (利用期限)
    - `status`: "利用中" | "停止中" | "申請中" | "延長申請中" | "アーカイブ" | "削除"
  - `archived_at`: Timestamp | null (アーカイブ日時)
    - `requested_expiration_date`: Timestamp | null (延長希望日)
    - `last_updated_date`: Timestamp (最終更新日)
    - `created_at`: Timestamp (作成日時、オプション)
    - `created_by`: string (作成者メールアドレス、オプション)
- **スプレッドシート側:** (参照のみ)
    - シート名: `ゲストアカウント一覧`
    - ※Firestoreの変更をトリガーに同期

### システム設定
- **Firestore側:**
    - Collection: `system_settings`
    - Document ID: `sequence`
    - `guest_sequence`: number (ゲストアカウントの連番)

### 各種ログ

#### スプレッドシート出力ログ
アプリからの操作時に、Google Sheets APIを使用して直接書き込みます。
ログはすべて「2行目に新しい行を挿入（降順維持）」します。

1. **発行ログ** (シート名: `発行ログ`)
    - Columns: `日時`, `作業者`, `対象アドレス`, `姓`, `名`, `所属`, `承認者`, `用途`, `利用期限`
2. **延長ログ** (シート名: `延長ログ`)
    - Columns: `日時`, `作業者`, `対象アドレス`, `利用期限`
3. **承認者変更ログ** (シート名: `承認者変更ログ`)
    - Columns: `日時`, `作業者`, `対象アドレス`, `委譲先承認者`
4. **延長申請ログ** (シート名: `延長申請ログ`)
    - Columns: `日時`, `作業者`, `希望利用期限`

#### Firestoreログ
システムの操作履歴をFirestoreに保存し、管理画面で閲覧可能です。

1. **管理ユーザー変更ログ** (Collection: `user_master_logs`)
    - `log_type`: "user_master_change"
    - `action`: "CREATE" | "UPDATE" | "DELETE"
    - `target_user_id`: string (対象ユーザーのメールアドレス)
    - `operator_id`: string (操作者のメールアドレス)
    - `operator_name`: string (操作者名)
    - `old_data`: Partial<UserMaster> | undefined (変更前のデータ)
    - `new_data`: Partial<UserMaster> | undefined (変更後のデータ)
    - `changed_fields`: string[] | undefined (変更されたフィールド名の配列)
    - `timestamp`: Timestamp (操作日時)
    - `description`: string | undefined (操作の説明)

2. **システムログ** (Collection: `system_logs`)
    - `log_type`: "issue" | "extend" | "delegate" | "extension_request" | "suspend" | "archive" | "restore"
    - `operator_id`: string (操作者のメールアドレス)
    - `operator_name`: string (操作者名)
    - `target_account_id`: string | undefined (対象アカウントのメールアドレス)
    - `data`: Record<string, any> (操作の詳細データ)
    - `timestamp`: Timestamp (操作日時)
    - `description`: string | undefined (操作の説明)

## 6. 機能要件

### A. 動的メニュー (Dynamic Menu)
ログインユーザーの属性に基づいてメニューを出し分ける:
- `is_admin === true`: 
    - [ゲストアカウント管理] (`/admin/accounts`)
    - [管理ユーザー管理] (`/admin/user-master`)
    - [ログ閲覧] (`/admin/logs`)
    - [システム設定] (`/admin/settings`)
    - 管理者は「通常ユーザービューに切り替え」ボタンで、正職員としての機能も利用可能
- `employment_status === "正職員"`: [ゲストアカウント発行] を表示
- `employment_status === "正職員"` かつ `guest_accounts` に `approver_id === 自分` のデータがある: [承認中アカウント一覧] を表示
- `employment_status === "ゲスト"`: [利用期限延長申請] を表示
- 上記以外: "表示できるメニューはありません" を表示

### B. ゲストアカウント発行 (Guest Account Issue)
- **ページ:** `/issue`
- **権限:** `employment_status === "正職員"`
- **入力項目:** 姓, 名, 所属(初期値:自分の所属), 承認者(初期値:自分), 用途, 利用期限(最大3ヶ月)
- **機能:** 「一人追加」ボタン。
    - **値の継承:** 追加された行は、所属・承認者・用途・期限について、一つ前の行の値を初期値としてコピーする。
- **アクション:**
    - 発行するアドレスを `guest_accounts` から `gst-<数字４桁の連番>@ogw3.com` で判断。
        - Firestoreのトランザクションを使って、`system_settings/sequence` から連番を取得し、重複しないように連番を採番すること
    - シート`発行ログ` の２行目に差し込み挿入。
    - AdminDirectory.Users.insert でアカウントを作成 (検証時点ではコメントアウト、"作成完了"を返す)
    - 作成完了が返ってこない場合:`guest_accounts` (status: "申請中") に書き込む、エラーが発生したことを管理者にメール。
    - 作成完了の場合:`guest_accounts` (status: "利用中") に書き込む、作成が完了したことを管理者とログインユーザーにメール。
    - 成功時は成功モーダルを表示。

### C. 承認中アカウント一覧 (Management List)
- **ページ:** `/management`
- **権限:** `employment_status === "正職員"` かつ `approver_id === 自分` のアカウントが存在
- **フィルタ:** `approver_id` がログインユーザーと一致するもの。
    - ただし、 (`status === "アーカイブ"` and `archived_at < (今日の日付 - 6ヶ月)`) のレコードは除外する。
- **表示項目:** メール, 氏名, 所属, 用途, 期限, ステータス
- **操作ボタン:**
    - **期限延長:**
        日付入力 (最大+3ヶ月)
        - **アクション:**
            - シート`延長ログ` の２行目に差し込み挿入。
            - `guest_accounts` に書き込む。
    - **情報修正:**
        氏名、所属、用途の編集
        - **アクション:**
            - `guest_accounts` に書き込む。
            - スプレッドシートへのログ出力は行わない。
    - **承認者変更:** 承認者の委譲
        委譲先承認者をアドレスで指定。
        `user_master` を参照、見つからない もしくは `employment_status !== "正職員"` の場合、 "見つかりません" を表示。
        問題がない場合、 "`所属` の `姓` `名` 様でお間違いないですか？" を表示。
        - **アクション:**
            - シート`承認者変更ログ` の２行目に差し込み挿入。
            - `guest_accounts` に書き込む。
            - 承認者を変更したことを承認者(To: 委譲元承認者, Cc: 委譲先承認者)にメール (現在はコンソールログ出力)。
    - **延長承認:** `status === "延長申請中"` の時のみ表示
        - **アクション:**
            - シート`延長ログ` の２行目に差し込み挿入。
            - `guest_accounts` 更新 (status: "利用中", expiration_date: requested_expiration_date, requested_expiration_date: null)。
    - **一時停止:** `status !== "停止中"` かつ `status !== "アーカイブ"` かつ `status !== "削除"` の時のみ表示
        - **アクション:**
            - `guest_accounts` 更新 (status: "停止中")。
            - Firestoreの `system_logs` に記録。
    - **アーカイブ:** `status !== "アーカイブ"` かつ `status !== "削除"` の時のみ表示
        - **アクション:**
            - `guest_accounts` 更新 (status: "アーカイブ", archived_at: 現在日時)。
            - Firestoreの `system_logs` に記録。
            - アーカイブから6ヶ月以上経過したアカウントは一覧から自動的に除外される。
    - **復旧:** `status === "停止中"` または `status === "アーカイブ"` の時のみ表示
        - **アクション:**
            - 利用期限を確認し、期限切れの場合は status: "申請中"、有効な場合は status: "利用中" に更新。
            - `archived_at` をクリア。
            - Firestoreの `system_logs` に記録。

### D. 利用期限延長申請 (Extension Request)
- **ページ:** `/extension`
- **権限:** `employment_status === "ゲスト"` かつ `guest_accounts` に自分のアカウントが存在
- **表示:** 現在のアカウント情報（利用期限、ステータス、既存の延長申請日）
- **入力:** 希望日を入力して申請（最大+3ヶ月）
- **アクション:**
    - シート`延長申請ログ` の２行目に差し込み挿入。
    - `guest_accounts` 更新 (status: "延長申請中", requested_expiration_date: 入力値)。
    - 成功時は成功モーダルを表示。

### E. 管理者機能

#### E-1. 全アカウント一覧
- **ページ:** `/admin/accounts`
- **権限:** `is_admin === true`
- **機能:** システムに登録されているすべてのゲストアカウントを表示
- **表示項目:** メール, 氏名, 所属, 承認者, 用途, 期限, ステータス
- **操作:** 承認中アカウント一覧と同様の操作が可能（期限延長、情報修正、承認者変更、延長承認）

#### E-2. ログ閲覧
- **ページ:** `/admin/logs`
- **権限:** `is_admin === true`
- **機能:** システムの各種ログを閲覧
- **表示内容:**
    - **管理ユーザー変更履歴:** `user_master` コレクションへの作成・更新・削除の履歴
        - 日時、操作（作成/更新/削除）、操作者、対象ユーザー、変更内容を表示
    - **ゲストアカウント変更履歴:** ゲストアカウントへの操作履歴（発行、延長、承認者変更、延長申請など）
        - 日時、種類、操作者、対象アカウント、詳細を表示
- **フィルター:** タブで「すべてのログ」「管理ユーザー変更履歴」「ゲストアカウント変更履歴」を切り替え可能

#### E-3. 管理ユーザー管理
- **ページ:** `/admin/user-master`
- **権限:** `is_admin === true`
- **機能:** `user_master` コレクションのユーザーを管理
- **表示項目:** メールアドレス、氏名、所属、雇用形態、管理者フラグ、最終更新日
- **操作:**
    - **ユーザー追加:** 新規ユーザーを作成（メールアドレス、氏名、所属、雇用形態、管理者フラグを設定）
    - **ユーザー編集:** 既存ユーザーの情報を更新（メールアドレスは変更不可）
    - **ユーザー削除:** ユーザーを削除（自分自身は削除不可）
- **フィルター・ソート:**
    - 所属、雇用形態でフィルター可能
    - 各列でソート可能
- **ログ:** すべての操作は `user_master_logs` コレクションに記録される

#### E-4. システム設定
- **ページ:** `/admin/settings`
- **権限:** `is_admin === true`
- **機能:** システム管理者用ページ（現在はプレースホルダー）

## 7. API エンドポイント

### POST `/api/issue`
ゲストアカウント発行API
- **認証:** IAP + `employment_status === "正職員"`
- **リクエストボディ:**
    ```json
    {
        "guests": [
            {
                "last_name": "string",
                "first_name": "string",
                "department": "string",
                "usage_purpose": "string",
                "approver_email": "string",
                "expiration_date": "YYYY-MM-DD"
            }
        ]
    }
    ```
- **レスポンス:**
    ```json
    {
        "success": true,
        "count": number
    }
    ```

### POST `/api/management/update`
アカウント管理更新API
- **認証:** IAP + `employment_status === "正職員"` + 承認者権限チェック（管理者は全アカウントに対して操作可能）
- **リクエストボディ:**
    ```json
    {
        "action": "EXTEND" | "EDIT" | "DELEGATE" | "APPROVE_EXTENSION" | "SUSPEND" | "ARCHIVE" | "RESTORE",
        "accountId": "string",
        "data": {
            // EXTEND: { "expiration_date": "YYYY-MM-DD" }
            // EDIT: { "last_name": "string", "first_name": "string", "department": "string", "usage_purpose": "string" }
            // DELEGATE: { "new_approver_id": "string" }
            // APPROVE_EXTENSION: { "approve": boolean }
            // SUSPEND: {} (データ不要)
            // ARCHIVE: {} (データ不要)
            // RESTORE: {} (データ不要)
        }
    }
    ```
- **レスポンス:**
    ```json
    {
        "success": true
    }
    ```
- **エラー:**
    - 400: 無効なアクション、ステータス制約違反（例: 既にアーカイブ済みのアカウントを再度アーカイブしようとした場合）
    - 403: 権限なし
    - 404: アカウントが見つからない

### POST `/api/extension`
延長申請API
- **認証:** IAP + `guest_accounts` に自分のアカウントが存在
- **リクエストボディ:**
    ```json
    {
        "requested_date": "YYYY-MM-DD"
    }
    ```
- **レスポンス:**
    ```json
    {
        "success": true
    }
    ```

### GET `/api/admin/logs`
ログ取得API
- **認証:** IAP + `is_admin === true`
- **クエリパラメータ:**
    - `type`: "all" | "user_master" | "system" (デフォルト: "all")
    - `limit`: number (デフォルト: 100)
- **レスポンス:**
    ```json
    {
        "logs": [...],  // typeが"all"でない場合
        "user_master_logs": [...],  // typeが"all"の場合
        "system_logs": [...]  // typeが"all"の場合
    }
    ```

### GET `/api/admin/user-master`
管理ユーザー一覧取得API
- **認証:** IAP + `is_admin === true`
- **レスポンス:**
    ```json
    {
        "users": [
            {
                "id": "string",
                "last_name": "string",
                "first_name": "string",
                "department": "string",
                "employment_status": "正職員" | "ゲスト" | "その他",
                "is_admin": boolean,
                "updated_at": "ISO8601 string"
            }
        ]
    }
    ```

### POST `/api/admin/user-master`
管理ユーザー作成API
- **認証:** IAP + `is_admin === true`
- **リクエストボディ:**
    ```json
    {
        "id": "string",
        "last_name": "string",
        "first_name": "string",
        "department": "string",
        "employment_status": "正職員" | "ゲスト" | "その他",
        "is_admin": boolean
    }
    ```
- **レスポンス:**
    ```json
    {
        "success": true
    }
    ```
- **エラー:**
    - 400: 必須項目不足、バリデーションエラー、既存ユーザー
    - 403: 権限なし

### PUT `/api/admin/user-master`
管理ユーザー更新API
- **認証:** IAP + `is_admin === true`
- **リクエストボディ:**
    ```json
    {
        "id": "string",
        "last_name": "string",
        "first_name": "string",
        "department": "string",
        "employment_status": "正職員" | "ゲスト" | "その他",
        "is_admin": boolean
    }
    ```
- **レスポンス:**
    ```json
    {
        "success": true
    }
    ```
- **エラー:**
    - 400: 必須項目不足、バリデーションエラー、無効な雇用形態
    - 403: 権限なし
    - 404: ユーザーが見つからない

### DELETE `/api/admin/user-master`
管理ユーザー削除API
- **認証:** IAP + `is_admin === true`
- **クエリパラメータ:**
    - `id`: string (削除するユーザーのメールアドレス)
- **レスポンス:**
    ```json
    {
        "success": true
    }
    ```
- **エラー:**
    - 400: ID未指定、自分自身を削除しようとした場合
    - 403: 権限なし
    - 404: ユーザーが見つからない

## 8. UIコンポーネント

### Sidebar
- ユーザー情報表示
- 動的メニュー表示
- ログアウトボタン

### GuestIssueForm
- 複数アカウントの一括入力フォーム
- 「一人追加」機能
- 値の継承機能

### ManagementTable
- アカウント一覧テーブル
- モーダルによる操作フォーム
- 延長申請の承認機能

### ExtensionRequestForm
- 延長申請フォーム
- 現在のアカウント情報表示

### SuccessModal
- 成功時のモーダル表示

### LogsViewer
- ログ閲覧コンポーネント
- タブで管理ユーザー変更履歴とゲストアカウント変更履歴を切り替え
- Firestoreからログを取得して表示

### UserMasterTable
- 管理ユーザー一覧テーブル
- ユーザーの追加、編集、削除機能
- フィルター・ソート機能

## 9. バリデーション

### 入力値の長さ制限
- **メールアドレス:** 50文字以内
- **姓:** 20文字以内
- **名:** 20文字以内
- **所属:** 50文字以内
- **用途:** 200文字以内

### 利用期限
- 最大3ヶ月の制限をすべての入力箇所で適用
- 発行時、延長時、延長申請時にチェック

### メールアドレス形式
- 基本的なメールアドレス形式チェック（`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`）
- 長さチェック（50文字以内）

### 承認者変更
- `user_master` に存在することを確認
- `employment_status === "正職員"` であることを確認

### 延長申請承認
- `status === "延長申請中"` であることを確認
- `requested_expiration_date` が存在することを確認

### 一時停止・アーカイブ・復旧
- **一時停止:** `status` が "停止中"、"アーカイブ"、"削除" の場合は不可
- **アーカイブ:** `status` が "アーカイブ"、"削除" の場合は不可
- **復旧:** `status` が "停止中" または "アーカイブ" の場合のみ可能

## 10. エラーハンドリング

### 認証エラー
- IAPトークンなし: 401 Unauthorized
- `user_master` に存在しない: サイドバーにエラーメッセージ表示

### 権限エラー
- 正職員でない: 403 Forbidden
- 承認者でない: 403 Forbidden

### バリデーションエラー
- 利用期限超過: 400 Bad Request + エラーメッセージ
- 承認者未存在: 400 Bad Request + エラーメッセージ

## 11. 開発環境

### 環境変数
- `IAP_JWT_AUDIENCE`: IAP JWT検証用のオーディエンス
- `NEXT_PUBLIC_MOCK_USER_EMAIL`: 開発環境でのモックユーザーメールアドレス
- `NODE_ENV`: 環境モード（development/production）

### ローカル開発
- 開発モードではIAP検証をバイパスし、モックユーザーを使用可能
- Firestore接続は本番と同じ設定を使用

## 12. 実装済み機能の詳細

### ログ機能
- **Firestoreログ:** すべての重要な操作（ユーザー管理、アカウント操作）はFirestoreに記録される
- **スプレッドシートログ:** ゲストアカウント関連の操作は引き続きスプレッドシートにも記録される
- **ログ閲覧:** 管理者は `/admin/logs` でログを閲覧可能

### アーカイブ機能
- アーカイブされたアカウントは6ヶ月後に自動的に一覧から除外される
- アーカイブ日時は `archived_at` フィールドに記録される
- 復旧機能により、アーカイブされたアカウントを再度利用可能にできる

### 管理者ビュー切り替え
- 管理者は「通常ユーザービューに切り替え」ボタンで、正職員としての機能を利用可能
- セッションストレージでビューモードを保持

## 13. 今後の拡張予定
- Google Admin SDK による実際のアカウント作成機能
- メール通知機能の実装
- スプレッドシートとの双方向同期
- その他の管理機能
