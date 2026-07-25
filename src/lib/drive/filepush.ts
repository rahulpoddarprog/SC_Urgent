import { getAuthClient, loadConfig } from '../google';
import { google } from 'googleapis';

export const FOLDER_NAME_MAP: Record<string, string> = {
  'Payment Receipts': 'College Payment Recipts',
  'Seat Allotment': 'WBJEE Seat Allotment',
  'Backlog Form PDF': 'Backlog Enrollment Form',
  'Backlog Pay Proof': 'Backlog Payment Proof',
  'CA Marks PDF': 'CA Marks',
  'PCA Marks PDF': 'PCA Makrs',
  'Signature Image': 'Signature',
};

const folderCache: Record<string, string> = {};

export function extractDriveFileId(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const match = urlStr.match(/(?:file\/d\/|id=|open\?id=)([\w-]{25,})/);
  if (match) return match[1];
  if (/^[\w-]{25,}$/.test(urlStr.trim())) return urlStr.trim();
  return null;
}

export async function getOrCreateCategorySubfolder(categoryName: string): Promise<string | null> {
  const config = loadConfig();
  const mainFolderId = config.target_drive_folder_id;

  if (!mainFolderId || mainFolderId.startsWith('YOUR_')) {
    return null;
  }

  if (folderCache[categoryName]) {
    return folderCache[categoryName];
  }

  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth: auth as never });

  const query = `'${mainFolderId}' in parents and name = '${categoryName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const existing = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (existing.data.files && existing.data.files.length > 0) {
    const subfolderId = existing.data.files[0].id!;
    folderCache[categoryName] = subfolderId;
    return subfolderId;
  }

  const newFolder = await drive.files.create({
    requestBody: {
      name: categoryName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [mainFolderId],
    },
    fields: 'id',
    supportsAllDrives: true
  });

  const newFolderId = newFolder.data.id!;
  folderCache[categoryName] = newFolderId;
  return newFolderId;
}

export async function copyFileToCategoryFolder(
  fileId: string,
  categoryLabel: string,
  customFileName?: string
): Promise<string | null> {
  const exactFolderName = FOLDER_NAME_MAP[categoryLabel] || categoryLabel;
  const targetSubfolderId = await getOrCreateCategorySubfolder(exactFolderName);
  if (!targetSubfolderId) return null;

  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth: auth as never });

  let nameToUse = customFileName;
  if (customFileName) {
    try {
      const originalMeta = await drive.files.get({
        fileId,
        fields: 'name',
        supportsAllDrives: true
      });
      const origName = originalMeta.data.name || '';
      const extMatch = origName.match(/\.([a-zA-Z0-9]+)$/);
      if (extMatch && !customFileName.endsWith('.' + extMatch[1])) {
        nameToUse = `${customFileName}.${extMatch[1]}`;
      }
    } catch (e) {
      console.warn('Could not fetch original file extension', e);
    }
  }

  // 1. Try Apps Script if configured (for physical copy)
  if (process.env.APPS_SCRIPT_URL) {
    const scriptUrl = process.env.APPS_SCRIPT_URL.replace(/['"]/g, '').trim();
    console.log(`[Copier] Triggering Apps Script at: ${scriptUrl}`);
    try {
      const fetchRes = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          targetFolderId: targetSubfolderId,
          customName: customFileName // Let Apps Script handle extension matching as per doPost
        }),
        redirect: 'follow'
      });

      const responseText = await fetchRes.text();
      console.log(`[Copier] Apps Script Raw Response:`, responseText);

      try {
        const data = JSON.parse(responseText);
        if (data.success && data.newFileId) {
          console.log(`[Copier] Apps Script success! New ID: ${data.newFileId}`);
          return data.newFileId;
        } else {
          throw new Error(data.error || "Apps Script returned success=false");
        }
      } catch {
        if (responseText.includes("Access denied") || responseText.includes("You need permission") || responseText.includes("<!DOCTYPE html>")) {
          throw new Error("Apps Script deployment returned 'Access denied' HTML. Please set 'Who has access' to 'Anyone' in Apps Script deployment settings.");
        }
        throw new Error(`Apps Script returned invalid response: ${responseText.slice(0, 100)}`);
      }
    } catch (scriptErr) {
      console.error('[Copier] Apps Script execution failed:', scriptErr);
      throw new Error(`Apps Script file copying failed: ${(scriptErr as Error).message || scriptErr}`);
    }
  }

  // 2. Fallback to Drive Shortcut (Only when APPS_SCRIPT_URL is not configured)
  console.log(`[Copier] Falling back to shortcut creation for ${fileId}`);
  try {
    const res = await drive.files.create({
      requestBody: {
        name: nameToUse || undefined,
        mimeType: 'application/vnd.google-apps.shortcut',
        shortcutDetails: { targetId: fileId },
        parents: [targetSubfolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    console.log(`[Copier] Shortcut created successfully: ${res.data.id}`);
    return res.data.id || null;
  } catch (shortcutErr) {
    console.error(`[Copier] CRITICAL: Shortcut fallback also failed! Reason:`, shortcutErr);
    throw new Error(`Failed to create Drive shortcut: ${(shortcutErr as Error).message || shortcutErr}`);
  }
}

export async function pushDriveFiles(
  driveUrls: Array<{ url: string; category?: string } | string>,
  cleanRecordMap: Record<string, string>
): Promise<Record<string, string>> {
  const updatedUrlsMap: Record<string, string> = {};

  if (!Array.isArray(driveUrls) || driveUrls.length === 0) {
    return updatedUrlsMap;
  }

  const collegeRoll = cleanRecordMap['College Roll'] || '';
  const uniRoll = cleanRecordMap['University Roll'] || '';
  const paidSems = cleanRecordMap['Paid Semesters'] || '';

  const semMatches = paidSems.match(/\b([1-8])\b/g);
  const maxSem = semMatches ? Math.max(...semMatches.map(Number)) : 6;

  for (const item of driveUrls) {
    const urlStr = typeof item === 'string' ? item : item.url;
    const category = typeof item === 'object' && item.category ? item.category : 'General Uploads';

    const fileId = extractDriveFileId(urlStr);
    if (fileId) {
      let customName: string | undefined = undefined;
      if (category === 'Payment Receipts') customName = `${collegeRoll || 'CollegeRoll'}_1st-to-${maxSem}_Sem`;
      else if (category === 'CA Marks PDF') customName = `${uniRoll || 'UniversityRoll'}_CAMarks`;
      else if (category === 'PCA Marks PDF') customName = `${uniRoll || 'UniversityRoll'}_PCAMarks`;
      else if (category === 'Signature Image') customName = `${collegeRoll || 'CollegeRoll'}_Signature`;
      else if (category === 'Backlog Pay Proof') customName = `${collegeRoll || 'CollegeRoll'}_PaymentProof`;
      else if (category === 'Backlog Form PDF') customName = `${uniRoll || 'UniversityRoll'}_BacklogEnrollment`;
      else if (category === 'Seat Allotment') customName = `${uniRoll || 'UniversityRoll'}_SeatAllotment`;

      try {
        const newFileId = await copyFileToCategoryFolder(fileId, category, customName);
        if (newFileId) {
          updatedUrlsMap[category] = `https://drive.google.com/open?id=${newFileId}`;
        } else {
          throw new Error(`File copying returned null for file ID: ${fileId}`);
        }
      } catch (copyErr) {
        console.error(`CRITICAL: Failed copying asset ${fileId} to category '${category}':`, copyErr);
        throw new Error(`Document copy failed for category '${category}': ${(copyErr as Error).message || copyErr}. Halting approval.`);
      }
    }
  }

  return updatedUrlsMap;
}
