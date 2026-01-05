const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// ゲストアカウント一覧を表示するスクリプト
// USAGE: node scripts/list_guest_accounts.js

async function listGuestAccounts() {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : undefined;

    // Initialize Firebase Admin with available credentials
    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        initializeApp();
    } else {
        // Try to use Application Default Credentials (ADC)
        try {
            initializeApp();
        } catch (error) {
            console.error("Please set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY, or run 'gcloud auth application-default login'");
            process.exit(1);
        }
    }

    const db = getFirestore();
    
    console.log('ゲストアカウント一覧:\n');
    
    // すべてのゲストアカウントを取得
    const snapshot = await db.collection('guest_accounts').get();
    
    if (snapshot.empty) {
        console.log('ゲストアカウントが見つかりませんでした。');
        return;
    }

    let index = 1;
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`${index}. ${doc.id}`);
        console.log(`   名前: ${data.last_name || '(未設定)'} ${data.first_name || '(未設定)'}`);
        console.log(`   所属: ${data.department || '(未設定)'}`);
        console.log(`   用途: ${data.usage_purpose || '(未設定)'}`);
        console.log(`   ステータス: ${data.status || '(未設定)'}`);
        console.log(`   利用期限: ${data.expiration_date ? data.expiration_date.toDate().toLocaleDateString('ja-JP') : '(未設定)'}`);
        console.log('');
        index++;
    });

    console.log(`合計: ${snapshot.size} 件`);
}

listGuestAccounts().catch(error => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
});

