
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Simple script to be run with node
// USAGE: node scripts/seed_users.js

async function seed() {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : undefined;

    if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.error("Please set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY");
        process.exit(1);
    }

    initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : undefined
    });

    const db = getFirestore();
    const batch = db.batch();

    const users = [
        {
            id: "admin@example.com",
            last_name: "管理者",
            first_name: "太郎",
            department: "情報システム部",
            employment_status: "正職員",
            is_admin: true
        },
        {
            id: "approver@example.com",
            last_name: "承認",
            first_name: "花子",
            department: "人事部",
            employment_status: "正職員",
            is_admin: false
        },
        {
            id: "guest@example.com",
            last_name: "招待",
            first_name: "客",
            department: "外部パートナー",
            employment_status: "ゲスト",
            is_admin: false
        }
    ];

    for (const user of users) {
        const ref = db.collection('user_master').doc(user.id);
        batch.set(ref, user);
    }

    await batch.commit();
    console.log('Seeding completed.');
}

seed().catch(console.error);
