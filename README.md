# プロジェクト仕様書

## 1. 概要
組織内の一時的なGoogleアカウント（ゲストアカウント）を管理する利用者向けのインターフェース。
他の機能も実装予定のため、拡張性を持たせること。
- **ユーザー:** 管理者、正職員（承認者）、ゲスト

## 2. 技術スタック
- **フレームワーク:** Next.js (App Router)
- **言語:** TypeScript (Strict mode)
- **スタイリング:** Tailwind CSS
- **データベース:** Cloud Firestore
- **外部連携:** Google Sheets API, Admin SDK (Directory API)
- **認証:** Identity-Aware Proxy (IAP) + アプリ独自の認可ロジック (Blocking Functions)
- **デプロイ:** Cloud Run (Docker)

## 3. コーディング規約
- **変数名・DBのキー:** 英語 (camelCase または snake_case)
    - *理由:* JSON/JWTの互換性と、AIの解釈精度を高めるため。
- **型定義・コメント・UIの表示:** 日本語
    - *理由:* 開発者（私）とユーザーにとっての可読性を確保するため。
- **ディレクトリ構造:**
    - `app/`: ルーティングと各ページ
    - `components/`: 再利用可能なUIパーツ
    - `lib/`: 共通ロジック (Firebase設定, IAP検証など)
    - `services/`: ビジネスロジック (DB操作など)
    - `types/`: TypeScriptの型定義
    - `utils/`: ヘルパー関数

## 4. セキュリティと認証
- **IAP検証:** バックエンド側で必ず `x-goog-iap-jwt-assertion` ヘッダーを検証し、IAPを回避したアクセスを防ぐこと。
- **認可フロー:**
    - **Step 1:** IAPによるドメイン/グループ制限（インフラ層）。
    - **Step 2:** アプリ層でFirestoreの `user_master` コレクションを参照。
        - Blocking Functionsを使い、ログインが完了する前に実行。
        - `user_master` に存在しないユーザはログインを拒否した上で "あなたのアカウントは`user_master`に存在しません" を表示。

## 5. データモデル
基本的にはFirestore側で処理しつつ、管理者がデータにアクセスしやすいよう
スプレッドシートとデータを同期します。
スプレッドシートID: `1WDJvweOGdqOkZjkR6yyMYtnRxaJUvxrF1TFHkzLpmAQ`
### ユーザマスタ
ログイン時に使用するデータ。
- **Firestore側:** (
参照のみ、１時間に１回 スプレッドシートからデータを取得する。
    - Collection: `user_master`
    - `id` : string (メールアドレス)
    - `last_name`: string (姓)
    - `first_name`: string (名)
    - `department`: string (所属)
    - `employment_status`: "正職員" | "ゲスト" | "その他"
    - `is_admin`: boolean (システム管理者フラグ)
- **スプレッドシート側:**
    - シート名: `ユーザマスタ`

### ゲストアカウント一覧
管理対象であるゲストアカウントの詳細データ。
- **Firestore側:** (読み書き)
    - Collection: `guest_accounts`
    - `id` : string (メールアドレス)
    - `last_name`: string (姓)
    - `first_name`: string (名)
    - `department`: string (所属)
    - `usage_purpose`: string (用途)
    - `approver_id`: string (承認者アドレス - `user_master`と紐付け)
    - `expiration_date`: Timestamp (利用期限)
    - `status`: "利用中" | "停止中" | "申請中" | "延長申請中"
    - `requested_expiration_date`: Timestamp (延長希望日)
    - `last_updated_date`: Timestamp (最終更新日)
- **スプレッドシート側:** (参照のみ)
    - シート名: `ゲストアカウント一覧`
    - ※Firestoreの変更をトリガーに同期

### 各種ログ (スプレッドシート出力)
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

## 6. 機能要件
### A. 動的メニュー (Dynamic Menu)
ログインユーザーの属性に基づいてメニューを出し分ける:
- `is_admin === true`: [システム設定] を表示
- `employment_status === "正職員"`: [ゲストアカウント発行] を表示
- `employment_status === "正職員"` かつ `guest_accounts` に `approver_id === 自分` のデータがある: [承認中アカウント一覧] を表示
- `employment_status === "ゲスト"`: [利用期限延長申請] を表示
- 上記以外: "表示できるメニューはありません" を表示

### B. ゲストアカウント発行 (Guest Account Issue)
- **入力項目:** 姓, 名, 所属(初期値:自分の所属), 承認者(初期値:自分), 用途, 利用期限(最大3ヶ月)
- **機能:** 「一人追加」ボタン。
    - **値の継承:** 追加された行は、所属・承認者・用途・期限について、一つ前の行の値を初期値としてコピーする。
- **アクション:**
	- 発行するアドレスを `guest_accounts` から `gst-<数字４桁の連番>@ogw3.com` で判断。
		- Firestoreのトランザクションを使って、重複しないように連番を採番すること
    - シート`発行ログ` の２行目に差し込み挿入。
    - AdminDirectory.Users.insert でアカウントを作成 (検証時点ではコメントアウト、"作成完了"を返す)
    - 作成完了が返ってこない場合:`guest_accounts` (status: "申請中") に書き込む、エラーが発生したことを管理者にメール。
	- 作成完了の場合:`guest_accounts` (status: "利用中") に書き込む、作成が完了したことを管理者とログインユーザーにメール。
    
### C. 承認中アカウント一覧 (Management List)
- **フィルタ:** `approver_email` がログインユーザーと一致するもの。
- ただし、 (`status === "停止中"` and `last_updated_date < (今日の日付 - 6ヶ月)`) のレコードは除外する。
- **表示項目:** メール, 氏名, 所属, 用途, 期限, ステータス
- **操作ボタン:**
	-  **期限延長:**
		日付入力 (最大+3ヶ月)
		- **アクション:**
		    - シート`延長ログ` の２行目に差し込み挿入。
			- `guest_accounts` に書き込む。
	-  **情報修正:**
		氏名、所属、用途の編集
		- **アクション:**
			- `guest_accounts` に書き込む。
	-  **承認者変更:** 承認者の委譲
		委譲先承認者をアドレスで指定。
		`user_master` を参照、見つからない もしくは `employment_status !== "正職員"` の場合、 "見つかりません" を表示。
		問題がない場合、 "`所属` の `姓` `名` 様でお間違いないですか？" を表示。
		- **アクション:**
		    - シート`承認者変更ログ` の２行目に差し込み挿入。
			- `guest_accounts` に書き込む。
		    - 承認者を変更したことを承認者(To: 委譲元承認者, Cc: 委譲先承認者)にメール。
	-  **延長承認/却下:** `status === "延長申請中"` の時のみ表示
		- **アクション:**
		    - シート`延長ログ` の２行目に差し込み挿入。
			- `guest_accounts` 更新 (status: "利用中", requested_expiration_date: null)。

### D. 利用期限延長申請 (Extension Request)
希望日を入力して申請。
	- **アクション:**
	    - シート`延長申請ログ` の２行目に差し込み挿入。
		- `guest_accounts` 更新 (status: "延長申請中", requested_expiration_date: 入力値)。

---
