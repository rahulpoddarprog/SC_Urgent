import { VALID_BACKLOG_OPTIONS } from './hasbackflag';
import { normalizeString, levenshteinDistance } from './basicdataflag';

export type BackinfoStatus = 'VALID' | 'EMPTY' | 'MISTAKE' | 'NA';

export interface BackinfoFieldResult {
  status: BackinfoStatus;
  badgeLabel: string;
}

export type BackinfoResultsMap = Record<string, BackinfoFieldResult>;

const BACKINFO_FIELDS = [
  'Backlog Form PDF',
  'No of Backlogs',
  'Not Permitted Count',
  'Permitted Count',
  'Backlog Pay Proof',
  'UTR / Txn ID',
  'Payment Date'
];

export function isBackinfoApplicable(backlogVal: string): boolean {
  if (!backlogVal || !backlogVal.trim()) return false;
  const normVal = normalizeString(backlogVal);

  // Check against option 0 and option 1
  for (let i = 0; i < 2; i++) {
    const opt = VALID_BACKLOG_OPTIONS[i];
    const normOpt = normalizeString(opt);
    if (normVal === normOpt || levenshteinDistance(normVal, normOpt) <= 10) {
      return true;
    }
  }
  return false;
}

export function validateBackinfoFields(backlogVal: string, rawData?: Record<string, string>): BackinfoResultsMap {
  const results: BackinfoResultsMap = {};
  const applicable = isBackinfoApplicable(backlogVal);

  // Map clean labels to their value in rawData
  const valueMap: Record<string, string> = {};
  if (rawData) {
    Object.entries(rawData).forEach(([k, v]) => {
      const lower = k.toLowerCase();
      if (lower.includes('backlog enrollment form')) valueMap['Backlog Form PDF'] = v;
      if (lower.includes('number of subjects in which you have backlogs') || lower.includes('no of backlogs')) valueMap['No of Backlogs'] = v;
      if (lower.includes('not permitted to appear')) valueMap['Not Permitted Count'] = v;
      if (lower.includes('were permitted to appear')) valueMap['Permitted Count'] = v;
      if (lower.includes('screenshot of the payment') || lower.includes('backlog pay proof')) valueMap['Backlog Pay Proof'] = v;
      if (lower.includes('utr transaction id') || lower.includes('utr / txn id')) valueMap['UTR / Txn ID'] = v;
      if (lower.includes('date of payment') || lower.includes('payment date')) valueMap['Payment Date'] = v;
    });
  }

  for (const field of BACKINFO_FIELDS) {
    if (!applicable) {
      results[field] = { status: 'NA', badgeLabel: 'N/A' };
      continue;
    }

    const val = (valueMap[field] || '').trim();
    if (!val) {
      results[field] = { status: 'EMPTY', badgeLabel: 'EMPTY' };
      continue;
    }

    if (field === 'No of Backlogs' || field === 'Not Permitted Count' || field === 'Permitted Count') {
      if (/^\d+$/.test(val)) {
        results[field] = { status: 'VALID', badgeLabel: 'VALID' };
      } else {
        results[field] = { status: 'MISTAKE', badgeLabel: 'MISTAKE' };
      }
    } else if (field === 'UTR / Txn ID') {
      // Strictly 12 character number only
      if (/^\d{12}$/.test(val)) {
        results[field] = { status: 'VALID', badgeLabel: 'VALID' };
      } else {
        results[field] = { status: 'MISTAKE', badgeLabel: 'MISTAKE' };
      }
    } else if (field === 'Payment Date') {
      // Check if valid date format or parseable date
      const isRegexDate = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(val) || /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(val);
      const isParseable = !isNaN(Date.parse(val));
      if (isRegexDate || isParseable) {
        results[field] = { status: 'VALID', badgeLabel: 'VALID' };
      } else {
        results[field] = { status: 'MISTAKE', badgeLabel: 'MISTAKE' };
      }
    } else {
      // PDF or Image proof fields
      results[field] = { status: 'VALID', badgeLabel: 'VALID' };
    }
  }

  return results;
}
