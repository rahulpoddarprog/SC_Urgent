import { db } from '../firebase';

export interface ApprovePayload {
  identityString?: string;
  timestamp?: string;
}

export async function executeApproveOperation(payload: ApprovePayload): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database is not initialized. Please configure Firebase credentials.' };
  }

  const { identityString, timestamp } = payload;
  const docId = identityString || timestamp;
  if (!docId) {
    return { success: false, error: 'Missing identityString and timestamp' };
  }

  try {
    const summaryRef = db.collection('system_metrics').doc('verification_summary');
    const passedRef = db.collection('passed_timestamps').doc(docId);
    const failedRef = db.collection('failed_timestamps').doc(docId);

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

      if (failedSnap.exists) {
        failedCount = Math.max(0, failedCount - 1);
        transaction.delete(failedRef);
      }
      if (!passedSnap.exists) {
        passedCount += 1;
      }

      const pendingCount = Math.max(0, totalCount - passedCount - failedCount);

      transaction.set(passedRef, {
        timestamp: timestamp || '',
        processedAt: new Date().toISOString(),
        action: 'PASS',
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
    console.error('Error executing approve operation in Firebase:', err);
    return { success: false, error: (err as Error).message };
  }
}
