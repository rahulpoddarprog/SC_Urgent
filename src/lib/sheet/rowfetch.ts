import { getSheetsClient, loadConfig } from '@/lib/google';

export async function fetchRowData(rowIndex: number): Promise<{ rawData: Record<string, string>; error?: string }> {
  try {
    const config = loadConfig();
    const sheets = getSheetsClient();
    const sheetName = config.source_worksheet_name || 'Form Responses 1';

    // Fetch headers (row 1) and specific data row (rowIndex)
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: config.source_sheet_id,
      ranges: [`${sheetName}!A1:ZZ1`, `${sheetName}!A${rowIndex}:ZZ${rowIndex}`],
    });

    const valueRanges = res.data.valueRanges;
    if (!valueRanges || valueRanges.length < 2) {
      return { rawData: {} };
    }

    const headers = valueRanges[0].values?.[0] || [];
    const rowValues = valueRanges[1].values?.[0] || [];

    const rawData: Record<string, string> = {};
    headers.forEach((header: unknown, index: number) => {
      const headerStr = String(header).trim();
      if (headerStr) {
        rawData[headerStr] = rowValues[index] !== undefined ? String(rowValues[index]).trim() : '';
      }
    });

    return { rawData };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error(`Google Sheets read error for row ${rowIndex}:`, errorMsg);
    return { rawData: {}, error: errorMsg };
  }
}
