import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { google } from 'googleapis';

export interface AppConfig {
  source_sheet_id: string;
  source_worksheet_name: string;
  target_sheet_id: string;
  target_worksheet_name: string;
  target_drive_folder_id: string;
  service_account_file?: string;
  service_account_path?: string;
}

export const TARGET_HEADER_SEQUENCE = [
  'Case Type',
  'Sl No.',
  'Name',
  'Contact No.',
  'Email',
  'College Roll',
  'University Roll',
  'Registration No',
  'Department',
  'Seat Allotment',
  'Paid Semesters',
  'Payment Receipts',
  'Extra Amount Paid',
  'Late Fine Paid',
  'Cleared Arrears',
  'Has Backlogs',
  'Backlog Form PDF',
  'No of Backlogs',
  'Not Permitted Count',
  'Permitted Count',
  'Backlog Pay Proof',
  'UTR / Txn ID',
  'Payment Date',
  'CA Marks PDF',
  'PCA Marks PDF',
  '5th Sem CA-2',
  '6th Sem CA-2',
  '5th Sem PCA-1',
  '5th Sem PCA-2',
  '6th Sem PCA-1',
  '6th Sem PCA-2',
  'Signature Image'
];

const CONFIG_PATH = path.join(process.cwd(), 'config', 'config.json');

export function loadConfig(): AppConfig {
  if (process.env.CONFIG_JSON) {
    try {
      return JSON.parse(process.env.CONFIG_JSON);
    } catch (e) {
      console.warn('Error parsing CONFIG_JSON env var:', e);
    }
  }

  const source_sheet_id = process.env.SOURCE_SHEET_ID || '1qbqXe_WYKbjKccIrkXdi8vxxtym6Mr-FKXURNvDUdwM';
  const target_sheet_id = process.env.TARGET_SHEET_ID || '1pEPIzwYVBKEqtkb7TQjPquXbVleSx80atQXK5lDN0lM';
  const target_drive_folder_id = process.env.TARGET_DRIVE_FOLDER_ID || '1zRC62lSPHGOPIPpkHZ_tGevVlGK5UIwm';

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const fileConfig = JSON.parse(raw);
      return {
        source_sheet_id: process.env.SOURCE_SHEET_ID || fileConfig.source_sheet_id,
        source_worksheet_name: process.env.SOURCE_WORKSHEET_NAME || fileConfig.source_worksheet_name || 'Form Responses 1',
        target_sheet_id: process.env.TARGET_SHEET_ID || fileConfig.target_sheet_id,
        target_worksheet_name: process.env.TARGET_WORKSHEET_NAME || fileConfig.target_worksheet_name || 'Main',
        target_drive_folder_id: process.env.TARGET_DRIVE_FOLDER_ID || fileConfig.target_drive_folder_id,
      };
    } catch (e) {
      console.warn('Could not parse local config.json:', e);
    }
  }

  return {
    source_sheet_id,
    source_worksheet_name: process.env.SOURCE_WORKSHEET_NAME || 'Form Responses 1',
    target_sheet_id,
    target_worksheet_name: process.env.TARGET_WORKSHEET_NAME || 'Main',
    target_drive_folder_id,
  };
}

function formatPrivateKey(pk: string): string {
  if (!pk || typeof pk !== 'string') return pk;
  let key = pk.trim();

  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\n/g, '\n');
  key = key.replace(/\r/g, '');

  const beginHeader = '-----BEGIN PRIVATE KEY-----';
  const endHeader = '-----END PRIVATE KEY-----';

  if (key.startsWith(beginHeader) && key.endsWith(endHeader)) {
    const body = key.substring(beginHeader.length, key.length - endHeader.length).trim();
    if (!body.includes('\n') || body.includes(' ')) {
      const cleanBody = body.replace(/\s+/g, '');
      const chunks = cleanBody.match(/.{1,64}/g) || [];
      key = [beginHeader, ...chunks, endHeader].join('\n');
    }
  }

  return key;
}

function validatePrivateKey(pk: string): { valid: boolean; error?: string } {
  try {
    const formatted = formatPrivateKey(pk);
    crypto.createPrivateKey(formatted);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

export function getAuthClient(): unknown {
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ];

  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_BASE64 environment variable is not defined!');
  }

  try {
    const decoded = Buffer.from(b64.trim(), 'base64').toString('utf-8');
    const credentials = JSON.parse(decoded);
    const privateKey = formatPrivateKey(credentials.private_key);

    const validation = validatePrivateKey(privateKey);
    if (!validation.valid) {
      throw new Error(`Private key validation failed: ${validation.error}`);
    }

    return new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes,
    });
  } catch (e) {
    throw new Error(`Failed to initialize Google Auth Client: ${(e as Error).message}`);
  }
}

export function getSheetsClient() {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth: auth as never });
}

export function getDriveClient() {
  const auth = getAuthClient();
  return google.drive({ version: 'v3', auth: auth as never });
}
