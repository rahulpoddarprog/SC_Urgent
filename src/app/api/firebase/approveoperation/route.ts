import { NextResponse } from 'next/server';
import { executeApproveOperation } from '@/lib/firebase/approveoperation';
import { pushToTargetSheet } from '@/lib/sheet/targetpush';
import { pushDriveFiles } from '@/lib/drive/filepush';
import { getCleanLabel } from '@/lib/header_map';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identityString, timestamp, recordMap, driveUrls, targetRowIndex } = body;

    if (!identityString || !timestamp) {
      return NextResponse.json({ success: false, error: 'Missing identityString or timestamp' }, { status: 400 });
    }

    // 1. If we have Drive files to push/copy
    const finalRecordMap = { ...recordMap };
    if (Array.isArray(driveUrls) && driveUrls.length > 0 && recordMap) {
      const cleanRecordMap: Record<string, string> = {};
      for (const [rawKey, val] of Object.entries(recordMap)) {
        cleanRecordMap[getCleanLabel(rawKey)] = String(val).trim();
      }

      // Copy files to target folders
      const updatedDriveUrls = await pushDriveFiles(driveUrls, cleanRecordMap);
      
      // Update our record map with the new Google Drive links
      for (const [category, newUrl] of Object.entries(updatedDriveUrls)) {
        // Find corresponding original key in recordMap and update it
        const origKey = Object.keys(finalRecordMap).find(k => getCleanLabel(k) === category);
        if (origKey) {
          finalRecordMap[origKey] = newUrl;
        }
      }
    }

    // 2. If targetRowIndex is provided, update the target Google Sheet
    if (targetRowIndex) {
      const rowIndexNum = Number(targetRowIndex);
      if (!isNaN(rowIndexNum) && rowIndexNum >= 2) {
        await pushToTargetSheet(rowIndexNum, finalRecordMap);
      }
    }

    // 3. Update Firebase database status
    const result = await executeApproveOperation({ identityString, timestamp });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API /api/firebase/approveoperation POST Error:', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
