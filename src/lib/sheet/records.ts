import { getSheetsClient, loadConfig } from '../google';

export const RAW_CASE_TYPE_HEADER = "Case Type - Find it from www.vakalatnama.co.in";
export const RAW_SERIAL_NO_HEADER = "Case Serial No. - Find it from www.vakalatnama.co.in";
export const RAW_NAME_HEADER = "Name";

export interface SheetIdentityRecord {
  rowIndex: number;
  caseType: string;
  serialNo: string;
  name: string;
  timestamp: string;
  identityString: string;
}

/**
 * Fetches sheet data rows and extracts identity fields + timestamp.
 * Row 2 in the Google Sheet maps to Record 1 (index + 2).
 */
export async function fetchFullSheetData(): Promise<{
  totalRows: number;
  records: SheetIdentityRecord[];
  error?: string;
}> {
  try {
    const config = loadConfig();
    const sheets = getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.source_sheet_id,
      range: `${config.source_worksheet_name || 'Form Responses 1'}!A1:ZZ`,
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) {
      return { totalRows: 0, records: [] };
    }

    const headers: string[] = rows[0].map((h: unknown) => String(h).trim());

    let caseTypeIdx = headers.indexOf(RAW_CASE_TYPE_HEADER);
    let serialNoIdx = headers.indexOf(RAW_SERIAL_NO_HEADER);
    let nameIdx = headers.indexOf(RAW_NAME_HEADER);

    if (caseTypeIdx === -1) {
      caseTypeIdx = headers.findIndex((h) => h.toLowerCase().includes('case type'));
    }
    if (serialNoIdx === -1) {
      serialNoIdx = headers.findIndex((h) => h.toLowerCase().includes('case serial no') || h.toLowerCase().includes('serial no'));
    }
    if (nameIdx === -1) {
      nameIdx = headers.findIndex((h) => h.toLowerCase() === 'name' || (h.toLowerCase().includes('name') && !h.toLowerCase().includes('file') && !h.toLowerCase().includes('roll')));
    }
    const timestampIdx = headers.findIndex((h) => h.toLowerCase().includes('timestamp'));

    const records: SheetIdentityRecord[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const caseType = caseTypeIdx !== -1 ? String(row[caseTypeIdx] || '').trim() : '';
      const serialNo = serialNoIdx !== -1 ? String(row[serialNoIdx] || '').trim() : '';
      const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
      const timestamp = timestampIdx !== -1 ? String(row[timestampIdx] || '').trim() : '';

      const rawIdentityString = `${caseType}__${serialNo}__${name}`;
      const identityString = rawIdentityString.replace(/[\/\\]/g, '_');

      records.push({
        rowIndex: i + 1,
        caseType,
        serialNo,
        name,
        timestamp,
        identityString,
      });
    }

    return {
      totalRows: rows.length - 1,
      records,
    };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error('Google Sheets read error:', errorMsg);
    return { totalRows: 0, records: [], error: errorMsg };
  }
}
