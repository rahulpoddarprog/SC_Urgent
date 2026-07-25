import { getCleanLabel, sortFieldsByCanonicalOrder } from '../header_map';
import { TargetRecordInfo } from '../sheet/targetpull';
import { validateAgainstTarget } from './basicdataflag';
import { calculateExtraFee, FeeCalculationResult } from './extrapaid';
import { calculateLateFine, LateFineResult } from './latefine';
import { validateBacklogOption, BacklogFlagResult } from './hasbackflag';
import { validateBackinfoFields, BackinfoResultsMap, BackinfoFieldResult } from './backinfoflag';
import { validateAllFormatFields, FormatResultsMap, FormatFieldResult } from './formatflag';
import { validateArrearOption, validateArrearDependentFields, ArrearFlagResult, ArrearDependentResultsMap, ArrearDependentResult } from './arrearflag';
import { RejectedDocsMap } from './docflag';

export interface FlagProblem {
  field: string;
  comment?: string;
  isDocument?: boolean;
  isDocRejection?: boolean;
}

export interface ProblemCollectionResult {
  problems: FlagProblem[];
  matchedPhone?: string;
  personName?: string;
}

export function collectRecordProblems(
  rawData?: Record<string, string>,
  targetRecords?: TargetRecordInfo[],
  rejectedDocs?: RejectedDocsMap | null
): { problems: FlagProblem[]; matchedPhone: string | null; personName: string } {
  const problems: FlagProblem[] = [];
  let matchedPhone: string | null = null;
  let personName = '';

  if (!rawData || Object.keys(rawData).length === 0) {
    return { problems, matchedPhone, personName };
  }

  // 1. Clean and sort fields
  let fields = Object.entries(rawData).map(([rawKey, value]) => ({
    label: getCleanLabel(rawKey),
    value,
    rawKey,
  }));
  fields = sortFieldsByCanonicalOrder(fields);

  // Extract common properties
  let dept = '';
  let paidSems = '';
  let extraAmount = '';
  let lateFineAmount = '';
  let backlogVal = '';
  let arrearVal = '';

  Object.entries(rawData).forEach(([k, v]) => {
    const lower = k.toLowerCase();
    if (lower === 'name' || (lower.includes('name') && !lower.includes('file') && !lower.includes('roll'))) {
      if (!personName) personName = v.trim();
    }
    if (lower.includes('department')) dept = v;
    if (lower.includes('paid fees as per the new fee structure') || lower.includes('please select multiple options')) paidSems = v;
    if (lower.includes('total extra amount paid') || lower.includes('extra amount')) extraAmount = v;
    if (lower.includes('late fine paid') || lower.includes('total late fine paid')) lateFineAmount = v;
    if (lower.includes('for students who had a backlog') || lower.includes('non-allowance in march 2026') || lower.includes('non‑allowance in march 2026')) backlogVal = v;
    if (lower.includes('after the dismissal of the case') || lower.includes('cleared all the arrear fees')) arrearVal = v;
  });

  // Calculate field results
  let feeCalcResult: FeeCalculationResult | null = null;
  let lateFineResult: LateFineResult | null = null;
  let backlogResult: BacklogFlagResult | null = null;
  let backinfoResults: BackinfoResultsMap | null = null;
  let formatResults: FormatResultsMap | null = null;
  let arrearResult: ArrearFlagResult | null = null;
  let arrearDependentResults: ArrearDependentResultsMap | null = null;

  if (dept || paidSems || extraAmount) {
    feeCalcResult = calculateExtraFee(dept, paidSems, extraAmount);
  }
  if (paidSems || lateFineAmount) {
    lateFineResult = calculateLateFine(paidSems, lateFineAmount);
  }
  if (backlogVal) {
    backlogResult = validateBacklogOption(backlogVal);
    backinfoResults = validateBackinfoFields(backlogVal, rawData);
  }
  if (arrearVal) {
    arrearResult = validateArrearOption(arrearVal);
  }
  arrearDependentResults = validateArrearDependentFields(arrearVal, fields);
  formatResults = validateAllFormatFields(rawData);

  const isOverriddenNA = (label: string) => {
    return arrearDependentResults && arrearDependentResults[label]?.status === 'NA';
  };

  const isDocField = (field: string) => {
    const lower = field.toLowerCase();
    return lower.includes('pdf') || lower.includes('proof') || lower.includes('receipt') || lower.includes('image') || lower.includes('allotment') || lower.includes('upload');
  };

  // Basic target validation flags
  if (targetRecords && targetRecords.length > 0) {
    const validationResult = validateAgainstTarget(rawData, targetRecords);
    matchedPhone = validationResult.matchedPhone;
    if (validationResult.flags && validationResult.flags.length > 0) {
      validationResult.flags.forEach((f) => {
        problems.push({
          field: f.field || 'General',
          comment: f.message,
          isDocument: isDocField(f.field || ''),
          isDocRejection: false,
        });
      });
    }
  }

  // Extra Amount Paid
  if (feeCalcResult && !feeCalcResult.isMatch && !isOverriddenNA('Extra Amount Paid')) {
    problems.push({
      field: 'Extra Amount Paid',
      comment: `Expected Rs. ${feeCalcResult.calculatedExtraAmount} but found ${feeCalcResult.claimedExtraAmount}`,
      isDocument: false,
      isDocRejection: false,
    });
  }

  // Late Fine Paid
  if (lateFineResult && lateFineResult.status !== 'VALID' && !isOverriddenNA('Late Fine Paid')) {
    problems.push({
      field: 'Late Fine Paid',
      comment: lateFineResult.message || `Expected Rs. ${lateFineResult.expectedFine ?? '0'}`,
      isDocument: false,
      isDocRejection: false,
    });
  }

  // Has Backlogs
  if (backlogResult && !backlogResult.isValid && !isOverriddenNA('Has Backlogs')) {
    problems.push({
      field: 'Has Backlogs',
      comment: backlogResult.message || 'Invalid selection',
      isDocument: false,
      isDocRejection: false,
    });
  }

  // Backinfo results
  if (backinfoResults) {
    Object.entries(backinfoResults).forEach(([field, res]: [string, BackinfoFieldResult]) => {
      if (!isOverriddenNA(field) && (res.status === 'EMPTY' || res.status === 'MISTAKE')) {
        problems.push({
          field,
          comment: res.status === 'EMPTY' ? 'Required field is empty' : 'Invalid data format or value',
          isDocument: isDocField(field),
          isDocRejection: false,
        });
      }
    });
  }

  // Format results
  if (formatResults) {
    Object.entries(formatResults).forEach(([field, res]: [string, FormatFieldResult]) => {
      if (!isOverriddenNA(field) && (res.status === 'EMPTY' || res.status === 'MISTAKE')) {
        problems.push({
          field,
          comment: res.message || (res.status === 'EMPTY' ? 'Required field is empty' : 'Incorrect formatting (expected Sl No, Subject Name, Marks)'),
          isDocument: isDocField(field),
          isDocRejection: false,
        });
      }
    });
  }

  // Cleared Arrears
  if (arrearResult && !arrearResult.isValid) {
    problems.push({
      field: 'Cleared Arrears',
      comment: arrearResult.message || 'Mismatch in arrear selection',
      isDocument: false,
      isDocRejection: false,
    });
  }

  // Arrear dependent fields EMPTY
  if (arrearDependentResults) {
    Object.entries(arrearDependentResults).forEach(([field, res]: [string, ArrearDependentResult]) => {
      if (res.status === 'EMPTY') {
        problems.push({
          field,
          comment: 'Required field is empty',
          isDocument: isDocField(field),
          isDocRejection: false,
        });
      }
    });
  }

  // Rejected documents in UI
  if (rejectedDocs) {
    Object.entries(rejectedDocs).forEach(([label, info]) => {
      if (info && info.isRejected) {
        problems.push({
          field: label,
          comment: info.reason || '',
          isDocument: true,
          isDocRejection: true,
        });
      }
    });
  }

  return { problems, matchedPhone, personName };
}
