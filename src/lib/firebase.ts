import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

function initFirebase() {
  if (getApps().length > 0) {
    return getApp();
  }

  try {
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!base64Key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not defined in environment variables');
    }

    const b64 = base64Key.trim();
    const decoded = Buffer.from(b64, 'base64').toString('utf-8');
    const credentials = JSON.parse(decoded);
    const privateKey = formatPrivateKey(credentials.private_key);

    return initializeApp({
      credential: cert({
        projectId: credentials.project_id,
        clientEmail: credentials.client_email,
        privateKey,
      }),
      projectId: credentials.project_id,
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return null;
  }
}

const app = initFirebase();
export const db = app ? getFirestore(app) : null;
