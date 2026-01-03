
import { google } from 'googleapis';
import { getCurrentUser } from './auth';

const SHEET_ID = '1WDJvweOGdqOkZjkR6yyMYtnRxaJUvxrF1TFHkzLpmAQ';

export async function appendLog(sheetName: string, values: string[]) {
    try {
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client as any });

        // Spec: "2行目に新しい行を挿入（降順維持）" -> Insert at index 1 (0-indexed) ? 
        // Or just "insert row at top".
        // Sheets API "append" adds to bottom. To insert at top (row 2, below header), we need "batchUpdate" with "insertDimension" then "updateCells", or easier logic.
        // Actually, easiest is: Insert empty row at index 1, then update row 1 (header is 0).

        // 1. Insert empty row at index 1
        await googleSheets.spreadsheets.batchUpdate({
            spreadsheetId: SHEET_ID,
            requestBody: {
                requests: [
                    {
                        insertDimension: {
                            range: {
                                sheetId: await getSheetId(googleSheets, sheetName),
                                dimension: 'ROWS',
                                startIndex: 1,
                                endIndex: 2
                            },
                            inheritFromBefore: false,
                        }
                    }
                ]
            }
        });

        // 2. Update the new row
        await googleSheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A2`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [values]
            }
        });

    } catch (error) {
        console.error(`Failed to append to ${sheetName}:`, error);
        // Don't fail the whole request? Or do? spec doesn't say. Log is auditing, so maybe critical?
        // keeping as log for now.
    }
}

async function getSheetId(sheetsClient: any, sheetName: string): Promise<number> {
    const res = await sheetsClient.spreadsheets.get({
        spreadsheetId: SHEET_ID
    });
    const sheet = res.data.sheets?.find((s: any) => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId || 0;
}
