import { RecordFlag } from './basicdataflag';
import { FeeCalculationResult } from './extrapaid';
import { LateFineResult } from './latefine';
import { BacklogFlagResult } from './hasbackflag';
import { BackinfoResultsMap } from './backinfoflag';
import { RejectedDocsMap, countRejectedDocuments } from './docflag';
import { FormatResultsMap } from './formatflag';
import { ArrearFlagResult, ArrearDependentResultsMap } from './arrearflag';

export function countTotalFlags(
  basicFlags: RecordFlag[],
  feeResult: FeeCalculationResult | null,
  lateFineResult: LateFineResult | null,
  backlogResult: BacklogFlagResult | null,
  backinfoResults: BackinfoResultsMap | null,
  rejectedDocs?: RejectedDocsMap | null,
  formatResults?: FormatResultsMap | null,
  arrearResult?: ArrearFlagResult | null,
  arrearDependentResults?: ArrearDependentResultsMap | null
): number {
  let count = 0;

  const isOverriddenNA = (label: string) => {
    return arrearDependentResults && arrearDependentResults[label]?.status === 'NA';
  };

  // 1. Basic flags (each flag is a mismatch)
  if (basicFlags && basicFlags.length > 0) {
    count += basicFlags.length;
  }

  // 2. Extra Paid mismatch (only if not overridden to NA)
  if (feeResult && !feeResult.isMatch && !isOverriddenNA('Extra Amount Paid')) {
    count += 1;
  }

  // 3. Late Fine mismatch (only if not overridden to NA)
  if (lateFineResult && lateFineResult.status !== 'VALID' && !isOverriddenNA('Late Fine Paid')) {
    count += 1;
  }

  // 4. Backlog mismatch (only if not overridden to NA)
  if (backlogResult && !backlogResult.isValid && !isOverriddenNA('Has Backlogs')) {
    count += 1;
  }

  // 5. Backinfo flags (EMPTY or MISTAKE count as flags, unless overridden to NA)
  if (backinfoResults) {
    Object.entries(backinfoResults).forEach(([field, res]) => {
      if (!isOverriddenNA(field) && (res.status === 'EMPTY' || res.status === 'MISTAKE')) {
        count += 1;
      }
    });
  }

  // 6. Document rejection flags
  count += countRejectedDocuments(rejectedDocs);

  // 7. Format flags (EMPTY or MISTAKE count as flags, unless overridden to NA)
  if (formatResults) {
    Object.entries(formatResults).forEach(([field, res]) => {
      if (!isOverriddenNA(field) && (res.status === 'EMPTY' || res.status === 'MISTAKE')) {
        count += 1;
      }
    });
  }

  // 8. Arrear option mismatch
  if (arrearResult && !arrearResult.isValid) {
    count += 1;
  }

  // 9. Arrear dependent fields EMPTY flags
  if (arrearDependentResults) {
    Object.values(arrearDependentResults).forEach((res) => {
      if (res.status === 'EMPTY') {
        count += 1;
      }
    });
  }

  return count;
}
