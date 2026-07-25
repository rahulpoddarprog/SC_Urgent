import { normalizeString, levenshteinDistance } from './basicdataflag';

export const VALID_ARREAR_OPTIONS = [
  "Yes, I cleared all the arrear fees.",
  "No, I waited until the matter was before the Division Bench.",
  "I have been paying according to the Revised (New) Fee Structure from the beginning.",
  "I left the College, before all of the above cases took places"
];

export interface ArrearFlagResult {
  isValid: boolean;
  status: 'VALID' | 'MISMATCH';
  message?: string;
}

export type ArrearDependentStatus = 'EMPTY' | 'NA' | 'OK';

export interface ArrearDependentResult {
  status: ArrearDependentStatus;
  badgeLabel?: string;
}

export type ArrearDependentResultsMap = Record<string, ArrearDependentResult>;

export function getArrearOptionIndex(enteredValue: string): number {
  if (!enteredValue || !enteredValue.trim()) return -1;
  const norm = normalizeString(enteredValue);
  
  for (let i = 0; i < VALID_ARREAR_OPTIONS.length; i++) {
    const normOpt = normalizeString(VALID_ARREAR_OPTIONS[i]);
    if (norm === normOpt || levenshteinDistance(norm, normOpt) <= 12) {
      return i;
    }
  }

  // Also check startsWith/substring for safety against minor spelling/grammar variations
  if (norm.startsWith(normalizeString("Yes, I cleared"))) return 0;
  if (norm.startsWith(normalizeString("No, I waited"))) return 1;
  if (norm.startsWith(normalizeString("I have been paying according"))) return 2;
  if (norm.startsWith(normalizeString("I left the College"))) return 3;

  return -1;
}

export function validateArrearOption(enteredValue: string): ArrearFlagResult {
  if (!enteredValue || !enteredValue.trim()) {
    return { isValid: false, status: 'MISMATCH', message: 'Empty response' };
  }
  const idx = getArrearOptionIndex(enteredValue);
  if (idx !== -1) {
    return { isValid: true, status: 'VALID' };
  }
  return { isValid: false, status: 'MISMATCH', message: 'Mismatch: Unrecognized option selected' };
}

export function validateArrearDependentFields(
  arrearVal: string, 
  fields?: Array<{ label: string; value: string }>
): ArrearDependentResultsMap {
  const results: ArrearDependentResultsMap = {};
  if (!fields || fields.length === 0) return results;

  const idx = getArrearOptionIndex(arrearVal);
  if (idx === -1) return results;

  // Find index of 'Cleared Arrears' in the fields array
  let arrearsIdx = fields.findIndex(f => f.label === 'Cleared Arrears');
  if (arrearsIdx === -1) {
    // Fallback if not found by exact clean label, try matching lowercase
    arrearsIdx = fields.findIndex(f => f.label.toLowerCase().includes('cleared arrears') || f.label.toLowerCase().includes('arrear fees'));
  }

  // If option 4 ("I left the college...") is selected (idx === 3):
  // Everything after 'Cleared Arrears' EXCEPT 'Signature Image' is N/A!
  if (idx === 3 && arrearsIdx !== -1) {
    for (let i = arrearsIdx + 1; i < fields.length; i++) {
      const f = fields[i];
      if (f.label !== 'Signature Image') {
        results[f.label] = { status: 'NA', badgeLabel: 'N/A' };
      }
    }
    return results;
  }

  // If option 1, 2, or 3 is selected (idx === 0 || idx === 1 || idx === 2):
  // The fields: 'Paid Semesters', 'Extra Amount Paid', 'Payment Receipts', 'Late Fine Paid' are applicable.
  // Check if they are available or not, if not then flag as EMPTY ,, no comment.
  if (idx === 0 || idx === 1 || idx === 2) {
    const applicableFields = ['Paid Semesters', 'Extra Amount Paid', 'Payment Receipts', 'Late Fine Paid'];
    for (const f of fields) {
      if (applicableFields.includes(f.label)) {
        const val = (f.value || '').trim();
        if (!val) {
          results[f.label] = { status: 'EMPTY', badgeLabel: 'EMPTY' };
        } else {
          results[f.label] = { status: 'OK' };
        }
      }
    }
  }

  return results;
}
