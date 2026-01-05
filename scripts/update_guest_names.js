const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// ゲストアカウントの名前と用途を適切なものに変更するスクリプト
// USAGE: node scripts/update_guest_names.js

// 適当な名前のパターン（検索用）
const inappropriateNames = [
    'テスト', 'test', 'Test', 'TEST',
    'ゲスト', 'guest', 'Guest', 'GUEST',
    'サンプル', 'sample', 'Sample', 'SAMPLE',
    'ダミー', 'dummy', 'Dummy', 'DUMMY',
    '例', 'example', 'Example', 'EXAMPLE',
    'aaa', 'AAA', 'bbb', 'BBB', 'ccc', 'CCC',
    '123', '456', '789',
    '名前', 'name', 'Name', 'NAME',
    '姓', '名', 'first', 'last'
];

// 適切な名前のリスト（ランダムに選択）
const appropriateNames = [
    { last_name: '山田', first_name: '太郎' },
    { last_name: '佐藤', first_name: '花子' },
    { last_name: '鈴木', first_name: '一郎' },
    { last_name: '田中', first_name: '美咲' },
    { last_name: '高橋', first_name: '健太' },
    { last_name: '伊藤', first_name: 'さくら' },
    { last_name: '渡辺', first_name: '大輔' },
    { last_name: '中村', first_name: '麻衣' },
    { last_name: '小林', first_name: '翔太' },
    { last_name: '加藤', first_name: '優子' },
    { last_name: '吉田', first_name: '直樹' },
    { last_name: '山本', first_name: '由美' },
    { last_name: '松本', first_name: '雄一' },
    { last_name: '井上', first_name: '愛美' },
    { last_name: '木村', first_name: '誠' },
    { last_name: '林', first_name: '絵美' },
    { last_name: '斎藤', first_name: '和也' },
    { last_name: '清水', first_name: '理恵' },
    { last_name: '山口', first_name: '達也' },
    { last_name: '森', first_name: '千佳' }
];

// 適切な用途のリスト（ランダムに選択）
const appropriatePurposes = [
    '研究活動',
    '共同研究プロジェクト',
    '学術交流',
    'セミナー・講演会',
    'インターンシップ',
    '外部委託業務',
    'システム開発支援',
    'データ分析業務',
    '資料作成支援',
    '翻訳業務',
    '調査・研究補助',
    'イベント運営支援',
    '広報活動',
    '技術サポート',
    'プロジェクト管理',
    '会計・経理業務',
    '人事業務',
    '営業活動',
    'マーケティング',
    '品質管理'
];

function isInappropriateName(name) {
    if (!name || name.trim() === '') return true;
    const trimmed = name.trim();
    
    // 既存のパターンマッチング
    if (inappropriateNames.some(pattern => 
        trimmed.toLowerCase().includes(pattern.toLowerCase()) ||
        trimmed === pattern
    )) {
        return true;
    }
    
    // 1文字または2文字の名前（日本語の場合は例外あり）
    if (trimmed.length <= 2) {
        // 日本語の場合は2文字でも許容（例: "太郎"）
        const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(trimmed);
        if (!hasJapanese) {
            return true;
        }
    }
    
    // 同じ文字の繰り返し（例: "aaa", "iii", "111"）
    if (trimmed.length > 1 && /^(.)\1+$/.test(trimmed)) {
        return true;
    }
    
    // 意味のない文字列（短いアルファベットのみ、数字のみなど）
    if (trimmed.length <= 3) {
        if (/^[a-z]+$/i.test(trimmed) || /^[0-9]+$/.test(trimmed)) {
            return true;
        }
    }
    
    // 長すぎる名前（テストデータの可能性）
    if (trimmed.length > 50) {
        return true;
    }
    
    // "メールアドレス"などのテスト用の文字列を含む
    if (trimmed.includes('メールアドレス') || trimmed.includes('255文字') || trimmed.includes('テスト')) {
        return true;
    }
    
    return false;
}

function getRandomAppropriateName() {
    const randomIndex = Math.floor(Math.random() * appropriateNames.length);
    return appropriateNames[randomIndex];
}

function isInappropriatePurpose(purpose) {
    if (!purpose || purpose.trim() === '') return true;
    const trimmed = purpose.trim();
    
    // テスト関連のパターン
    const testPatterns = [
        'テスト', 'test', 'Test', 'TEST',
        'サンプル', 'sample', 'Sample', 'SAMPLE',
        'ダミー', 'dummy', 'Dummy', 'DUMMY',
        '例', 'example', 'Example', 'EXAMPLE'
    ];
    
    if (testPatterns.some(pattern => 
        trimmed.toLowerCase().includes(pattern.toLowerCase()) ||
        trimmed === pattern
    )) {
        return true;
    }
    
    // 1文字または2文字の用途
    if (trimmed.length <= 2) {
        const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(trimmed);
        if (!hasJapanese) {
            return true;
        }
    }
    
    // 同じ文字の繰り返し（例: "aaa", "iii", "ああ"）
    if (trimmed.length > 1 && /^(.)\1+$/.test(trimmed)) {
        return true;
    }
    
    // 意味のない文字列（短いアルファベットのみ、数字のみなど）
    if (trimmed.length <= 5) {
        if (/^[a-z]+$/i.test(trimmed) || /^[0-9]+$/.test(trimmed)) {
            return true;
        }
    }
    
    // 同じ文字が多く含まれる（例: "oiiii", "ffff"）
    if (trimmed.length >= 3) {
        const charCounts = {};
        for (const char of trimmed.toLowerCase()) {
            charCounts[char] = (charCounts[char] || 0) + 1;
        }
        const maxCount = Math.max(...Object.values(charCounts));
        // 同じ文字が全体の70%以上を占める場合は不適切
        if (maxCount / trimmed.length >= 0.7) {
            return true;
        }
    }
    
    // 長すぎる用途（テストデータの可能性）
    if (trimmed.length > 100) {
        return true;
    }
    
    return false;
}

function getRandomAppropriatePurpose() {
    const randomIndex = Math.floor(Math.random() * appropriatePurposes.length);
    return appropriatePurposes[randomIndex];
}

async function updateGuestNames() {
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
    
    console.log('ゲストアカウントを確認中...\n');
    
    // すべてのゲストアカウントを取得
    const snapshot = await db.collection('guest_accounts').get();
    
    if (snapshot.empty) {
        console.log('ゲストアカウントが見つかりませんでした。');
        return;
    }

    const accountsToUpdate = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const last_name = data.last_name || '';
        const first_name = data.first_name || '';
        const usage_purpose = data.usage_purpose || '';
        
        const needsNameUpdate = isInappropriateName(last_name) || isInappropriateName(first_name);
        const needsPurposeUpdate = isInappropriatePurpose(usage_purpose);
        
        if (needsNameUpdate || needsPurposeUpdate) {
            accountsToUpdate.push({
                id: doc.id,
                current: {
                    last_name: last_name,
                    first_name: first_name,
                    usage_purpose: usage_purpose
                },
                needsNameUpdate: needsNameUpdate,
                needsPurposeUpdate: needsPurposeUpdate,
                ref: doc.ref
            });
        }
    });

    if (accountsToUpdate.length === 0) {
        console.log('適当な名前のゲストアカウントは見つかりませんでした。');
        return;
    }

    console.log(`修正が必要なゲストアカウントが ${accountsToUpdate.length} 件見つかりました:\n`);
    
    accountsToUpdate.forEach((account, index) => {
        console.log(`${index + 1}. ${account.id}`);
        console.log(`   現在の名前: ${account.current.last_name} ${account.current.first_name}`);
        console.log(`   現在の用途: ${account.current.usage_purpose}`);
        if (account.needsNameUpdate) console.log(`   → 名前を修正`);
        if (account.needsPurposeUpdate) console.log(`   → 用途を修正`);
    });

    console.log('\n以下のように変更します:\n');

    const batch = db.batch();
    let updateCount = 0;

    accountsToUpdate.forEach((account, index) => {
        const updateData = {
            last_updated_date: Timestamp.now()
        };
        
        let changes = [];
        
        if (account.needsNameUpdate) {
            const newName = getRandomAppropriateName();
            updateData.last_name = newName.last_name;
            updateData.first_name = newName.first_name;
            changes.push(`名前: ${account.current.last_name} ${account.current.first_name} → ${newName.last_name} ${newName.first_name}`);
        }
        
        if (account.needsPurposeUpdate) {
            const newPurpose = getRandomAppropriatePurpose();
            updateData.usage_purpose = newPurpose;
            changes.push(`用途: ${account.current.usage_purpose} → ${newPurpose}`);
        }
        
        console.log(`${index + 1}. ${account.id}`);
        changes.forEach(change => console.log(`   ${change}`));
        
        batch.update(account.ref, updateData);
        updateCount++;
    });

    console.log(`\n${updateCount} 件のアカウントを更新します...`);
    
    if (updateCount > 0) {
        await batch.commit();
        console.log('更新が完了しました！');
    } else {
        console.log('更新するアカウントがありませんでした。');
    }
}

updateGuestNames().catch(error => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
});

