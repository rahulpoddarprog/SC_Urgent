import { getSheetsClient, loadConfig } from '../google';
import { getCleanLabel } from '../header_map';

export interface TargetRecordInfo {
  phone: string;
  name: string;
  serial: string;
  caseType: string;
}

export async function getTargetData(): Promise<TargetRecordInfo[]> {
  const config = loadConfig();
  if (!config.target_sheet_id || config.target_sheet_id.startsWith('YOUR_')) {
    return [];
  }

  const sheets = getSheetsClient();
  const range = `${config.target_worksheet_name || 'Main'}!A1:ZZ`;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.target_sheet_id,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return [];

    const rawHeaders = rows[0] || [];
    const cleanHeaders = rawHeaders.map((h: unknown) => getCleanLabel(String(h || '').trim()));

    let caseTypeIdx = cleanHeaders.indexOf('Case Type');
    let serialIdx = cleanHeaders.indexOf('Sl No.');
    let nameIdx = cleanHeaders.indexOf('Name');
    let phoneIdx = cleanHeaders.indexOf('Contact No.');

    // Fallbacks using loose matching if exact clean label wasn't found
    if (caseTypeIdx === -1) {
      caseTypeIdx = rawHeaders.findIndex((h: unknown) => String(h).toLowerCase().includes('case type'));
    }
    if (serialIdx === -1) {
      serialIdx = rawHeaders.findIndex((h: unknown) => {
        const str = String(h).toLowerCase();
        return str.includes('serial') || str.includes('sl no');
      });
    }
    if (nameIdx === -1) {
      nameIdx = rawHeaders.findIndex((h: unknown) => {
        const str = String(h).toLowerCase().trim();
        return str === 'name' || (str.includes('name') && !str.includes('file') && !str.includes('roll'));
      });
    }
    if (phoneIdx === -1) {
      phoneIdx = rawHeaders.findIndex((h: unknown) => {
        const str = String(h).toLowerCase();
        return str.includes('contact') || str.includes('phone') || str.includes('mobile');
      });
    }

    const targetData: TargetRecordInfo[] = [];

    // Skip header (row 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const caseType = caseTypeIdx !== -1 ? String(row[caseTypeIdx] || '').trim() : '';
      const serial = serialIdx !== -1 ? String(row[serialIdx] || '').trim() : '';
      const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
      const phone = phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '';

      targetData.push({ caseType, serial, name, phone });
    }

    return targetData;
  } catch (e) {
    console.warn('Could not fetch target sheet records', e);
    return [];
  }
}
