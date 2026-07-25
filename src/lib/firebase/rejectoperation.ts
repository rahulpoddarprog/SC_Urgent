import { db } from '../firebase';

export interface RejectPayload {
  identityString?: string;
  timestamp?: string;
  name?: string;
  caseType?: string;
  serialNo?: string;
  problems?: Array<{ field: string; comment: string; isDocument?: boolean; isDocRejection?: boolean }>;
}

export async function executeRejectOperation(payload: RejectPayload): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database is not initialized. Please configure Firebase credentials.' };
  }

  const { identityString, timestamp, name, caseType, serialNo, problems } = payload;
  const docId = identityString || timestamp;
  if (!docId) {
    return { success: false, error: 'Missing identityString and timestamp' };
  }

  try {
    const summaryRef = db.collection('system_metrics').doc('verification_summary');
    const failedRef = db.collection('failed_timestamps').doc(docId);
    const passedRef = db.collection('passed_timestamps').doc(docId);

    await db.runTransaction(async (transaction) => {
      const passedSnap = await transaction.get(passedRef);
      const failedSnap = await transaction.get(failedRef);
      const summarySnap = await transaction.get(summaryRef);

      let passedCount = 0;
      let failedCount = 0;
      let totalCount = 0;

      if (summarySnap.exists) {
        const d = summarySnap.data();
        passedCount = d?.passedCount || 0;
        failedCount = d?.failedCount || 0;
        totalCount = d?.totalCount || 0;
      }

      if (passedSnap.exists) {
        passedCount = Math.max(0, passedCount - 1);
        transaction.delete(passedRef);
      }
      if (!failedSnap.exists) {
        failedCount += 1;
      }

      const pendingCount = Math.max(0, totalCount - passedCount - failedCount);

      transaction.set(failedRef, {
        identityString: docId,
        timestamp: timestamp || '',
        name: name || '',
        caseType: caseType || '',
        serialNo: serialNo || '',
        problems: problems || [],
        action: 'FAIL',
        processedAt: new Date().toISOString(),
      }, { merge: true });

      transaction.set(summaryRef, {
        passedCount,
        failedCount,
        pendingCount,
        lastSyncedAt: new Date().toISOString(),
      }, { merge: true });
    });

    return { success: true };
  } catch (err) {
    console.error('Error executing reject operation in Firebase:', err);
    return { success: false, error: (err as Error).message };
  }
}
