const { Firestore } = require('@google-cloud/firestore');
const { google } = require('googleapis');

const SHEET_ID = '1WDJvweOGdqOkZjkR6yyMYtnRxaJUvxrF1TFHkzLpmAQ';
const firestore = new Firestore();

/**
 * Helper: Get Google Sheets client
 */
async function getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
}

/**
 * Helper: Get Sheet ID by name
 */
async function getSheetId(sheetsClient, sheetName) {
    const res = await sheetsClient.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheet = res.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId || 0;
}

/**
 * 1. Firestore Trigger: Export all guest_accounts to spreadsheet on any change
 * This function is triggered on any document write in guest_accounts collection
 */
exports.syncGuestAccountsToSheet = async (event) => {
    console.log('Firestore trigger: guest_accounts changed');

    try {
        const sheetsClient = await getSheetsClient();
        const sheetName = 'ゲストアカウント一覧';

        // Fetch all guest accounts from Firestore
        const snapshot = await firestore.collection('guest_accounts').get();

        if (snapshot.empty) {
            console.log('No guest accounts found');
            return;
        }

        // Prepare header and data rows
        const headers = ['ID', '姓', '名', '所属', '用途', '承認者', '有効期限', 'ステータス', '最終更新日'];
        const rows = snapshot.docs.map(doc => {
            const data = doc.data();
            return [
                data.id || doc.id,
                data.last_name || '',
                data.first_name || '',
                data.department || '',
                data.usage_purpose || '',
                data.approver_id || '',
                data.expiration_date ? data.expiration_date.toDate().toLocaleDateString('ja-JP') : '',
                data.status || '',
                data.last_updated_date ? data.last_updated_date.toDate().toLocaleString('ja-JP') : ''
            ];
        });

        // Clear existing data and write new data
        const sheetId = await getSheetId(sheetsClient, sheetName);

        // Clear the sheet (except header if you want to keep it)
        await sheetsClient.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A:Z`
        });

        // Write header + data
        await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [headers, ...rows]
            }
        });

        console.log(`Successfully exported ${rows.length} guest accounts to spreadsheet`);
    } catch (error) {
        console.error('Error syncing guest accounts to sheet:', error);
    }
};

/**
 * 2. HTTP Function: Manual export of user_master to spreadsheet (one-time)
 */
exports.exportUserMasterToSheet = async (req, res) => {
    console.log('Manual export: user_master to spreadsheet');

    try {
        const sheetsClient = await getSheetsClient();
        const sheetName = 'ユーザマスタ';

        // Fetch all users from Firestore
        const snapshot = await firestore.collection('user_master').get();

        if (snapshot.empty) {
            res.status(200).send('No users found');
            return;
        }

        // Prepare header and data rows
        const headers = ['ID(メール)', '姓', '名', '所属', '雇用形態', '管理者フラグ'];
        const rows = snapshot.docs.map(doc => {
            const data = doc.data();
            return [
                data.id || doc.id,
                data.last_name || '',
                data.first_name || '',
                data.department || '',
                data.employment_status || '',
                data.is_admin ? 'TRUE' : 'FALSE'
            ];
        });

        // Clear and write
        await sheetsClient.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A:Z`
        });

        await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [headers, ...rows]
            }
        });

        res.status(200).send(`Successfully exported ${rows.length} users to spreadsheet`);
    } catch (error) {
        console.error('Error exporting user_master:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
};

/**
 * 3. Scheduled Function: Sync user_master from spreadsheet to Firestore (every 1 hour)
 */
exports.syncUserMasterFromSheet = async (event) => {
    console.log('Scheduled sync: spreadsheet -> Firestore (user_master)');

    try {
        const sheetsClient = await getSheetsClient();
        const sheetName = 'ユーザマスタ';

        // Read data from spreadsheet
        const response = await sheetsClient.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A:F`
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            console.log('No data found in spreadsheet');
            return;
        }

        // Skip header row
        const dataRows = rows.slice(1);

        // Batch write to Firestore
        const batch = firestore.batch();
        let count = 0;

        for (const row of dataRows) {
            const [id, lastName, firstName, department, employmentStatus, isAdminStr] = row;

            if (!id) continue; // Skip empty rows

            const userRef = firestore.collection('user_master').doc(id);
            batch.set(userRef, {
                id: id,
                last_name: lastName || '',
                first_name: firstName || '',
                department: department || '',
                employment_status: employmentStatus || 'その他',
                is_admin: isAdminStr === 'TRUE' || isAdminStr === 'true' || isAdminStr === '1'
            }, { merge: true });

            count++;
        }

        await batch.commit();
        console.log(`Successfully synced ${count} users from spreadsheet to Firestore`);
    } catch (error) {
        console.error('Error syncing from spreadsheet:', error);
    }
};
