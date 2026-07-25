import { loadConfig, getAuthClient } from '../google';
import { google } from 'googleapis';
import { getCleanLabel } from '../header_map';
import { TARGET_HEADER_SEQUENCE } from '../google';

export async function pushToTargetSheet(
  rowIndex: number,
  recordMap: Record<string, string>
): Promise<boolean> {
  const config = loadConfig();
  if (!config.target_sheet_id || config.target_sheet_id.startsWith('YOUR_')) {
    throw new Error('Target Sheet ID is not configured.');
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: auth as never });
  const worksheet = config.target_worksheet_name || 'Main';

  // 1. Clean the incoming recordMap keys to match TARGET_HEADER_SEQUENCE
  const cleanRecordMap: Record<string, string> = {};
  for (const [key, val] of Object.entries(recordMap)) {
    if (!key.startsWith('_')) {
      cleanRecordMap[getCleanLabel(key)] = String(val || '').trim();
    }
  }

  // 2. Map cleanRecordMap to TARGET_HEADER_SEQUENCE to prepare raw payload
  const rawPayload = TARGET_HEADER_SEQUENCE.map(h => cleanRecordMap[h] || '');

  // 3. Fetch existing row to preserve columns we didn't submit or are empty
  const range = `${worksheet}!A${rowIndex}:ZZ${rowIndex}`;
  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: config.target_sheet_id,
    range,
  });

  const existingRow = existingRes.data.values && existingRes.data.values.length > 0
    ? existingRes.data.values[0]
    : [];

  // 4. Merge payload with existing row
  const mergedPayload = rawPayload.map((newVal, idx) => {
    const existingVal = existingRow[idx] !== undefined ? String(existingRow[idx]).trim() : '';
    return newVal === '' ? existingVal : newVal;
  });

  // 5. Update the row
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.target_sheet_id,
    range: `${worksheet}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [mergedPayload],
    },
  });

  return true;
}
