import { db } from '../firebase';

const METRICS_COLLECTION = 'system_metrics';
const SUMMARY_DOC_ID = 'verification_summary';
const PASSED_TIMESTAMPS = 'passed_timestamps';
const FAILED_TIMESTAMPS = 'failed_timestamps';

export interface SystemStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
}

/**
 * Fetches the set of already verified record timestamps from Firestore.
 */
export async function getProcessedTimestamps(): Promise<{
  timestamps: Set<string>;
  passedCount: number;
  failedCount: number;
}> {
  const timestamps = new Set<string>();
  let passedCount = 0;
  let failedCount = 0;

  if (!db) {
    return { timestamps, passedCount, failedCount };
  }

  const passedSnap = await db.collection(PASSED_TIMESTAMPS).get();
  passedCount = passedSnap.size;
  passedSnap.forEach((doc) => {
    const t = doc.data().timestamp;
    if (t) timestamps.add(t);
  });

  const failedSnap = await db.collection(FAILED_TIMESTAMPS).get();
  failedCount = failedSnap.size;
  failedSnap.forEach((doc) => {
    const t = doc.data().timestamp;
    if (t) timestamps.add(t);
  });

  return { timestamps, passedCount, failedCount };
}

/**
 * Reads stats metadata summary doc from Firestore.
 */
export async function getStatsSummary(): Promise<SystemStats | null> {
  if (!db) return null;

  const doc = await db.collection(METRICS_COLLECTION).doc(SUMMARY_DOC_ID).get();
  if (!doc.exists) return null;

  const data = doc.data();
  return {
    total: data?.totalCount || 0,
    passed: data?.passedCount || 0,
    failed: data?.failedCount || 0,
    pending: data?.pendingCount || 0,
  };
}

/**
 * Saves/updates calculated stats summary metadata in Firestore.
 */
export async function updateStatsSummary(stats: SystemStats): Promise<boolean> {
  if (!db) return false;

  await db.collection(METRICS_COLLECTION).doc(SUMMARY_DOC_ID).set({
    totalCount: stats.total,
    passedCount: stats.passed,
    failedCount: stats.failed,
    pendingCount: stats.pending,
    lastSyncedAt: new Date().toISOString(),
  }, { merge: true });

  return true;
}
