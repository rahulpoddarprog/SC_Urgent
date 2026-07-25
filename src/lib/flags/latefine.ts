export interface LateFineResult {
  expectedFine: number | null;
  status: 'VALID' | 'MISMATCH' | 'MANUAL_VERIFY';
  message: string;
}

export function calculateLateFine(paidSemestersStr: string, claimedLateFineStr: string): LateFineResult {
  const selectedSemesters: number[] = [];
  const semMatches = (paidSemestersStr || '').match(/\b([2-8])(?:st|nd|rd|th)?\b/gi);
  if (semMatches) {
    semMatches.forEach((match) => {
      const semNum = parseInt(match.replace(/\D/g, ''), 10);
      if (!selectedSemesters.includes(semNum)) selectedSemesters.push(semNum);
    });
  }
  
  selectedSemesters.sort();
  const semsStr = selectedSemesters.join(',');

  let expectedFine: number | null = null;
  let status: 'VALID' | 'MISMATCH' | 'MANUAL_VERIFY' = 'VALID';
  let message = '';

  const has4 = selectedSemesters.includes(4);
  const has5 = selectedSemesters.includes(5);

  // Condition 1: If they selected second semester to sixth semester or seventh semester, value = 0
  if (semsStr === '2,3,4,5,6' || semsStr === '2,3,4,5,6,7') {
    expectedFine = 0;
  }
  // Condition 2: If they haven't selected fourth semester and fifth semester, value = 7000
  else if (!has4 && !has5) {
    expectedFine = 7000;
  }
  // Condition 3: Anything else -> flag as mistake, please verify
  else {
    expectedFine = null;
    status = 'MANUAL_VERIFY';
    message = 'Flag as mistake: Please verify.';
  }

  // Compare with user's claimed amount if we have an expected fine
  const claimedFine = parseInt((claimedLateFineStr || '').replace(/\D/g, ''), 10) || 0;

  if (status !== 'MANUAL_VERIFY' && expectedFine !== null) {
    if (expectedFine === claimedFine) {
      status = 'VALID';
      message = `Math Verified: Expected ₹${expectedFine}`;
    } else {
      status = 'MISMATCH';
      message = `Math Mismatch: Expected ₹${expectedFine}, but claimed ₹${claimedFine}`;
    }
  }

  return { expectedFine, status, message };
}
