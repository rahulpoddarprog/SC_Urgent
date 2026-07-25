import { db } from '../firebase';

export const PASSED_COLLECTION = 'passed_timestamps';
export const FAILED_COLLECTION = 'failed_timestamps';

/**
 * Checks if a record exists in 'passed_timestamps' or 'failed_timestamps' by its document ID (identityString),
 * and verifies if the stored timestamp matches the current sheet timestamp.
 */
export async function checkRecordVerification(
  identityString: string,
  timestamp: string
): Promise<'passed' | 'failed' | null> {
  if (!db || !identityString || !timestamp) return null;

  try {
    // Check in passed collection
    const passedRef = db.collection(PASSED_COLLECTION).doc(identityString);
    const passedSnap = await passedRef.get();
    if (passedSnap.exists) {
      const data = passedSnap.data();
      if (data?.timestamp === timestamp) {
        return 'passed';
      }
    }

    // Check in failed collection
    const failedRef = db.collection(FAILED_COLLECTION).doc(identityString);
    const failedSnap = await failedRef.get();
    if (failedSnap.exists) {
      const data = failedSnap.data();
      if (data?.timestamp === timestamp) {
        return 'failed';
      }
    }
  } catch (err) {
    console.error('Error checking record verification:', err);
  }

  return null;
}

/**
 * Fetches all processed timestamps to build filter Sets.
 */
export async function getProcessedRecords(): Promise<{
  passedTimestamps: Set<string>;
  failedTimestamps: Set<string>;
  allProcessedTimestamps: Set<string>;
}> {
  const passedTimestamps = new Set<string>();
  const failedTimestamps = new Set<string>();
  const allProcessedTimestamps = new Set<string>();

  if (!db) {
    return { passedTimestamps, failedTimestamps, allProcessedTimestamps };
  }

  try {
    const passedSnap = await db.collection(PASSED_COLLECTION).get();
    passedSnap.forEach((doc) => {
      const t = doc.data().timestamp;
      if (t) {
        passedTimestamps.add(t);
        allProcessedTimestamps.add(t);
      }
    });

    const failedSnap = await db.collection(FAILED_COLLECTION).get();
    failedSnap.forEach((doc) => {
      const t = doc.data().timestamp;
      if (t) {
        failedTimestamps.add(t);
        allProcessedTimestamps.add(t);
      }
    });
  } catch (err) {
    console.error('Failed to get processed records from database:', err);
  }

  return { passedTimestamps, failedTimestamps, allProcessedTimestamps };
}
