const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bcrypt = require('bcryptjs');

// 初期パスワード設定スクリプト
// 既存のuser_masterのユーザーに対して、メールアドレスの@の前の文字列を初期パスワードとしてハッシュ化して設定
// USAGE: node scripts/set_initial_passwords.js

async function setInitialPasswords() {
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
    
    try {
        // user_masterコレクションのすべてのドキュメントを取得
        const snapshot = await db.collection('user_master').get();
        
        if (snapshot.empty) {
            console.log('No users found in user_master collection.');
            return;
        }

        console.log(`Found ${snapshot.size} users. Setting initial passwords...`);

        const batch = db.batch();
        let updateCount = 0;

        for (const doc of snapshot.docs) {
            const userData = doc.data();
            const email = doc.id;

            // 既にパスワードハッシュが設定されている場合はスキップ
            if (userData.password_hash) {
                console.log(`Skipping ${email} (password already set)`);
                continue;
            }

            // メールアドレスの@の前の文字列を初期パスワードとして使用
            const atIndex = email.indexOf('@');
            if (atIndex === -1) {
                console.warn(`Invalid email format: ${email}, skipping...`);
                continue;
            }

            const initialPassword = email.substring(0, atIndex);
            
            // パスワードをハッシュ化
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(initialPassword, saltRounds);

            // パスワードハッシュを更新
            const ref = db.collection('user_master').doc(email);
            batch.update(ref, { password_hash: passwordHash });
            
            console.log(`Set initial password for ${email} (password: ${initialPassword})`);
            updateCount++;
        }

        if (updateCount > 0) {
            await batch.commit();
            console.log(`\nSuccessfully set initial passwords for ${updateCount} users.`);
        } else {
            console.log('\nAll users already have passwords set.');
        }

    } catch (error) {
        console.error('Error setting initial passwords:', error);
        process.exit(1);
    }
}

setInitialPasswords().catch(console.error);





