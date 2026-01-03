---
description: Google Cloud へのデプロイ手順
---

# Google Cloud (Cloud Run) へのデプロイ

このワークフローは、アプリケーションを Google Cloud Run にデプロイするための手順です。

## 前提条件

1.  Google Cloud プロジェクトが作成されていること。
2.  `gcloud` CLI がインストールされ、ログイン済みであること (`gcloud auth login`)。
3.  Cloud Build API と Cloud Run API が有効化されていること。

## デプロイ手順

以下のコマンドを実行して、ビルドとデプロイを行います。

```bash
# プロジェクトIDを設定（自身のプロジェクトIDに置き換えてください）
gcloud config set project [YOUR_PROJECT_ID]

# Cloud Build を使ってビルド・デプロイ
gcloud builds submit --config cloudbuild.yaml .
```

## 注意点

- **IAP (Identity-Aware Proxy) の設定**:
  このアプリケーションは認証に IAP を使用するように設計されています。Cloud Run に直接アクセスしても、IAP ヘッダーがないため「Unauthorized」エラーになります。
  本番環境で使用するには、ロードバランサー (HTTP LB) を構築し、IAP を有効化する必要があります。

- **環境変数**:
  Firestore や Google Sheets へのアクセスに必要な環境変数やサービスアカウントキー (`service-account.json`) がコンテナに含まれているか、または Secret Manager 経由でマウントされているか確認してください。
  現在の Dockerfile 設定では、プロジェクトルートのファイルがコピーされます。
