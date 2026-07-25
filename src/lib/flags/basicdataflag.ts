import { TargetRecordInfo } from '../sheet/targetpull';
import { getCleanLabel } from '../header_map';

export interface RecordFlag {
  code:
    | 'NAME_MISMATCH'
    | 'FILE_ISSUE'
    | 'FORMAT_ERROR'
    | 'MISSING_FIELD'
    | 'DEPRECATED_OPTION'
    | 'CALCULATION_DISCREPANCY'
    | 'MANUAL_FLAG'
    | 'VALID';
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  field?: string;
}

export function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/** Simple Levenshtein Distance for fuzzy string comparison */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Validates the current active record against the Target Sheet records.
 */
export function validateAgainstTarget(
  currentRecordData: Record<string, string>,
  targetRecords: TargetRecordInfo[]
): { flags: RecordFlag[]; matchedPhone: string | null } {
  const flags: RecordFlag[] = [];
  let matchedPhone: string | null = null;

  let caseType = '';
  let serialNo = '';
  let name = '';

  Object.entries(currentRecordData).forEach(([k, v]) => {
    const clean = getCleanLabel(k);
    if (clean === 'Case Type') caseType = String(v).trim();
    if (clean === 'Sl No.') serialNo = String(v).trim();
    if (clean === 'Name') name = String(v).trim();
  });

  if (!caseType && !serialNo && !name) {
    return { flags, matchedPhone };
  }

  const normSerial = normalizeString(serialNo);
  const normCase = normalizeString(caseType);
  const normName = normalizeString(name);

  // Score all targets to find the best loose match
  let bestMatch: TargetRecordInfo | null = null;
  let maxScore = -1;

  for (const t of targetRecords) {
    let score = 0;
    if (normalizeString(t.caseType) === normCase) score += 2;
    if (normalizeString(t.serial) === normSerial) score += 2;
    
    const dist = levenshteinDistance(normName, normalizeString(t.name));
    if (dist === 0) score += 2;
    else if (dist <= 3) score += 1; // Fuzzy match

    if (score > maxScore) {
      maxScore = score;
      bestMatch = t;
    }
  }

  // If score is too low, we confidently say we couldn't find them at all
  if (maxScore < 3 || !bestMatch) {
    flags.push({
      code: 'MISSING_FIELD',
      level: 'WARNING',
      message: 'Applicant completely not found in Target Sheet (No close matches for Name, Sl No, or Case Type).',
    });
    return { flags, matchedPhone };
  }

  matchedPhone = bestMatch.phone || null;

  // Now explicitly flag whichever fields don't match our confident bestMatch
  if (normalizeString(bestMatch.caseType) !== normCase) {
    flags.push({
      code: 'NAME_MISMATCH',
      level: 'WARNING',
      message: `Target Case Type: ${bestMatch.caseType}`,
      field: 'Case Type',
    });
  }

  if (normalizeString(bestMatch.serial) !== normSerial) {
    flags.push({
      code: 'NAME_MISMATCH',
      level: 'WARNING',
      message: `Target Sl No: ${bestMatch.serial}`,
      field: 'Sl No.',
    });
  }

  const nameDist = levenshteinDistance(normName, normalizeString(bestMatch.name));
  if (nameDist > 0) {
    flags.push({
      code: 'NAME_MISMATCH',
      level: 'WARNING',
      message: `Target Name: ${bestMatch.name}`,
      field: 'Name',
    });
  }

  return { flags, matchedPhone };
}
