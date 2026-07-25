import { getCleanLabel } from '../header_map';

export type FormatFlagStatus = 'VALID' | 'EMPTY' | 'MISTAKE' | 'NA';

export interface FormatFieldResult {
  status: FormatFlagStatus;
  badgeLabel: string;
  message?: string;
}

export type FormatResultsMap = Record<string, FormatFieldResult>;

const FORMAT_FIELDS = [
  '5th sem ca-2',
  '5th sem pca-1',
  '5th sem pca-2',
  '6th sem ca-2',
  '6th sem pca-1',
  '6th sem pca-2'
];

export function isFormatField(label: string): boolean {
  if (!label) return false;
  const norm = label.toLowerCase().replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-').trim();
  if (norm.startsWith('registration') || norm.includes('registration no') || norm.includes('registration number')) {
    return true;
  }
  return FORMAT_FIELDS.includes(norm);
}

export function validateFormatField(val: string, label?: string): FormatFieldResult {
  if (!val || !val.trim()) {
    return { status: 'EMPTY', badgeLabel: 'EMPTY' };
  }

  const trimmed = val.trim();

  // Special 12 character text based format check for REGISTRATION NO field
  if (label && (label.toLowerCase().includes('registration no') || label.toLowerCase().includes('registration number') || label.toLowerCase().startsWith('registration'))) {
    if (trimmed.length === 12) {
      return { status: 'VALID', badgeLabel: 'VALID' };
    } else {
      return { status: 'MISTAKE', badgeLabel: 'MISTAKE' };
    }
  }

  if (/^(N\/?A|None|Nil|Not Applicable|-|0|A|Absent)$/i.test(trimmed)) {
    return { status: 'VALID', badgeLabel: 'VALID' };
  }

  const lines = trimmed.split(/[\r\n]+/);
  let allValid = true;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 3) {
      allValid = false;
      break;
    }

    const first = parts[0].trim();
    const last = parts[parts.length - 1].trim();
    const middle = parts.slice(1, parts.length - 1).map(p => p.trim()).join(' ');

    // Check serial number at start (digits)
    if (!/^\d+$/.test(first)) {
      allValid = false;
      break;
    }

    // Check marks at end (digits, decimal, or A / Absent)
    if (!/^\d+(\.\d+)?$/.test(last) && !/^(A|Absent)$/i.test(last)) {
      allValid = false;
      break;
    }

    // Check that Name / Code in the middle is non-empty
    if (!middle) {
      allValid = false;
      break;
    }
  }

  if (allValid) {
    return { status: 'VALID', badgeLabel: 'VALID' };
  } else {
    return { status: 'MISTAKE', badgeLabel: 'MISTAKE' };
  }
}

export function validateAllFormatFields(rawData?: Record<string, string>): FormatResultsMap {
  const results: FormatResultsMap = {};
  if (!rawData) return results;

  Object.entries(rawData).forEach(([rawKey, val]) => {
    const label = getCleanLabel(rawKey);
    if (isFormatField(label)) {
      results[label] = validateFormatField(val, label);
    }
  });

  return results;
}
