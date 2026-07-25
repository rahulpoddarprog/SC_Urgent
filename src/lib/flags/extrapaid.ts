export interface FeeCalculationResult {
  group: 'GROUP_A' | 'GROUP_B';
  groupName: string;
  departmentDetected: string;
  selectedSemesters: string[];
  semesterFeeMap: Record<string, number>;
  calculatedExtraAmount: number;
  claimedExtraAmount: number;
  isMatch: boolean;
  breakdown: string;
}

// Group A: CSE, IT, ECE (New Fee: 72,025)
const GROUP_A_EXTRA_FEES: Record<string, number> = {
  '2': 72025 - 46450, // 25,575
  '3': 72025 - 47550, // 24,475
  '4': 72025 - 47550, // 24,475
  '5': 72025 - 50650, // 21,375
  '6': 72025 - 48650, // 23,375
  '7': 72025 - 49750, // 22,275
  '8': 72025 - 49750, // 22,275
};

// Group B: EE, ME, CE, CSD, CSE(AIML), CSE(DS) (New Fee: 65,700)
const GROUP_B_EXTRA_FEES: Record<string, number> = {
  '2': 65700 - 42450, // 23,250
  '3': 65700 - 43450, // 22,250
  '4': 65700 - 43450, // 22,250
  '5': 67700 - 46450, // 21,250
  '6': 65700 - 44450, // 21,250
  '7': 65700 - 45450, // 20,250
  '8': 65700 - 45450, // 20,250
};

export function calculateExtraFee(
  departmentStr: string,
  paidSemestersStr: string,
  claimedAmountStr: string
): FeeCalculationResult {
  const deptLower = (departmentStr || '').trim().toLowerCase();

  // Explicit Group Categorization based on exact submitted Google Form department names
  let group: 'GROUP_A' | 'GROUP_B' = 'GROUP_B';
  let groupName = 'EE/ME/CE/CSD/CSE(AIML)/CSE(DS)';

  const isGroupBSpecialization =
    deptLower.includes('artificial intelligence') ||
    deptLower.includes('machine learning') ||
    deptLower.includes('aiml') ||
    deptLower.includes('data science') ||
    deptLower.includes('ds') ||
    deptLower.includes('design') ||
    deptLower.includes('csd') ||
    deptLower.includes('electrical') ||
    deptLower.includes('mechanical') ||
    deptLower.includes('civil');

  const isGroupADepartment =
    deptLower.includes('information technology') ||
    deptLower === 'it' ||
    deptLower.includes('electronics') ||
    deptLower.includes('ece') ||
    (deptLower.includes('computer science') && !isGroupBSpecialization) ||
    (deptLower.includes('cse') && !isGroupBSpecialization);

  if (isGroupADepartment) {
    group = 'GROUP_A';
    groupName = 'CSE / IT / ECE';
  }

  const feeTable = group === 'GROUP_A' ? GROUP_A_EXTRA_FEES : GROUP_B_EXTRA_FEES;

  // Extract semester numbers from paidSemestersStr (e.g. "3rd Semester, 6th Semester")
  const selectedSemesters: string[] = [];
  const semMatches = paidSemestersStr.match(/\b([2-8])(?:st|nd|rd|th)?\b/gi);
  if (semMatches) {
    semMatches.forEach((match) => {
      const semNum = match.replace(/\D/g, '');
      if (semNum && feeTable[semNum] && !selectedSemesters.includes(semNum)) {
        selectedSemesters.push(semNum);
      }
    });
  }

  let calculatedExtraAmount = 0;
  const semesterFeeMap: Record<string, number> = {};

  selectedSemesters.forEach((sem) => {
    const fee = feeTable[sem] || 0;
    semesterFeeMap[sem] = fee;
    calculatedExtraAmount += fee;
  });

  const claimedExtraAmount = parseInt((claimedAmountStr || '').replace(/\D/g, ''), 10) || 0;
  const isMatch = calculatedExtraAmount === claimedExtraAmount;

  const semsFormatted = selectedSemesters
    .map((s) => `Sem ${s}: ₹${(feeTable[s] || 0).toLocaleString()}`)
    .join(' + ');

  const breakdown = `Expected Total: ₹${calculatedExtraAmount.toLocaleString()} [${semsFormatted || 'No Semesters Paid'}] (${groupName})`;

  return {
    group,
    groupName,
    departmentDetected: departmentStr,
    selectedSemesters,
    semesterFeeMap,
    calculatedExtraAmount,
    claimedExtraAmount,
    isMatch,
    breakdown,
  };
}
