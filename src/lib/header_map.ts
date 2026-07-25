// Mapping raw long Google Form headers to clean, short 1-2 word labels
export const HEADER_MAP: Record<string, string> = {
  "Timestamp": "Timestamp",
  "Email Address": "Email",
  "Name": "Name",
  "College Roll No.": "College Roll",
  "University Roll No.": "University Roll",
  "MAKAUT Registration Number": "Registration No",
  "Department": "Department",
  "Case Type - Find it from www.vakalatnama.co.in": "Case Type",
  "Case Serial No. - Find it from www.vakalatnama.co.in": "Sl No.",
  "After the dismissal of the case in January 2026, and prior to the victory at the Division Bench in March 2026, which petitioners had cleared all the arrear fees as per the revised fee structure?": "Cleared Arrears",
  "Paid Fees as per the New Fee Structure : Please select multiple options to indicate the semesters in which you paid under the revised(NEW) fee structure.": "Paid Semesters",
  "Should be Accurate for both TFW/Regular Candidates.\n\nWrite the Total Extra Amount Paid (as per the Revised Fee Structure) for all semesters where payments were made at the newly revised rates.\n\nEnter this amount in numerals only (e.g., 48374).\n\n🔴 NOTE: For each applicable semester, subtract the Old Semester Fee from the New Semester Fee, then add those amounts together to get your total extra amount paid.\n\n⚠️ IMPORTANT: Do NOT include or add any FINES or LATE FEES in this calculation.": "Extra Amount Paid",
  "📤 Upload Merged Payment Receipts (Single PDF)\n\nMerge all receipts into one PDF file in chronological order (from 1st Semester up to your current/latest semester).\n\n⚠️ File Name: CollegeRoll_1st-to-nth_Sem [Where n = Max Semester]": "Payment Receipts",
  "Should be Accurate for both TFW/Regular Candidates.\n\nWrite the Total Late Fine Paid (for 4th and 5th Semesters combined).\n\nEnter this total amount in numerals only (e.g., 7000 or 10000).\n\n🔴 NOTE: Obtain these figures directly from your 4th and 5th Semester payment receipts.\n\n⚠️ IF YOU DID NOT PAY ANY FINE in the 4th and 5th Semesters, enter 0.": "Late Fine Paid",
  "📤 Submit WBJEE Seat Allotment Letter. [PDF Format]\n\n🔴 NOTE : If you do not have this, or if you were admitted under the Management Quota, you are not required to upload it. However, uploading it is recommended, as it will be treated as an important document before the Supreme Court of India.": "Seat Allotment",
  "For students who had a backlog or backlogs in the 3rd Semester and were unable to appear for the examination due to non‑allowance in March 2026.": "Has Backlogs",
  "Submit your Backlog Enrollment Form for the 3rd Semester.\n\n🔴 Please follow the exact guidelines\n1. Visit your MAKAUT Student Portal, go to the 'Backlog Enrollment' Page.\n2. Click the three dot in your chrome browser and click the Print option.\n3. Make sure that the Layout is \"Potrait\" and Paper Size \"A4\"\n4. Save as PDF\n\n▶️ Referance Video: https://youtu.be/ysrWDkOGnRU\n\n⚠️ File Name: UniRoll_BacklogEnrollment": "Backlog Form PDF",
  "Submit your Backlog Enrollment Form for the 3rd Semester. \n\nGo to the MAKAUT Portal, log in, and click on ‘Backlog Enrollment Form’. \n\n🔴 Save it as a PDF using the ‘Print’ option from the three dots menu in Chrome, following the same process shown for the CA and PCA marks in the YouTube guide.": "Backlog Form PDF",
  "Specify the number of subjects in which you have backlogs. Eg. 3": "No of Backlogs",
  "Specify the number of subjects in which you were not permitted to appear. Eg. 1": "Not Permitted Count",
  "Specify the number of subjects in which you were permitted to appear. Eg. 2": "Permitted Count",
  "📤 Upload the Screenshot of the Payment of INR 1000 for the Backlog Examination. \n\nFollowing Details should be mentioned in the Screenshot [in PNG ot JPG/JPEG Format]\n1. UTR or Transaction ID (12 digit Numbers)\n2. Date of Payment \n3. Screenshot must be taken in Light Mode.\n\n⚠️ File Name: ClgRoll_PaymentProof": "Backlog Pay Proof",
  "UTR Transaction ID (12 Digit Number)\n\n✅ You can find this by :\nFor Phone Pe : It is UTR number\nFor Google Pay and Others : It is Transaction ID or Ref ID": "UTR / Txn ID",
  "Date of Payment": "Payment Date",
  "📤 Upload the 5th & 6th Semester CA Marks\n\n⚠️ File Name : UniversityRoll_CAMarks": "CA Marks PDF",
  "📤 Upload the 5th & 6th Semester PCA Marks\n\n File Name : UniversityRoll_PCAMarks": "PCA Marks PDF",
  "Enter the 5th Semester CA‑2 details": "5th Sem CA-2",
  "Enter the 5th Semester PCA-1 details": "5th Sem PCA-1",
  "Enter the 5th Semester PCA-2 details": "5th Sem PCA-2",
  "Enter the 6th Semester CA‑2 details": "6th Sem CA-2",
  "Enter the 6th Semester PCA-1 details": "6th Sem PCA-1",
  "Enter the 6th Semester PCA-2 details": "6th Sem PCA-2",
  "📤 Upload the Signature\n\n⚠️ File Name: CollageRoll_Signature": "Signature Image",
};

export function getCleanLabel(rawHeader: string): string {
  if (HEADER_MAP[rawHeader]) return HEADER_MAP[rawHeader];
  const cleaned = rawHeader.replace(/[\n\r]+/g, ' ').replace(/[^\x00-\x7F]/g, '').trim();
  if (cleaned.length > 30) return cleaned.substring(0, 27) + '...';
  return cleaned || rawHeader;
}

export const CANONICAL_FIELD_ORDER = [
  'Timestamp',
  'Email',
  'Name',
  'Contact No.',
  'College Roll',
  'University Roll',
  'Registration No',
  'Case Type',
  'Sl No.',
  'Department',
  'Seat Allotment',
  'Paid Semesters',
  'Payment Receipts',
  'Extra Amount Paid',
  'Late Fine Paid',
  'Cleared Arrears',
  'Has Backlogs',
  'Backlog Form PDF',
  'No of Backlogs',
  'Not Permitted Count',
  'Permitted Count',
  'Backlog Pay Proof',
  'UTR / Txn ID',
  'Payment Date',
  'CA Marks PDF',
  'PCA Marks PDF',
  '5th Sem CA-2',
  '6th Sem CA-2',
  '5th Sem PCA-1',
  '5th Sem PCA-2',
  '6th Sem PCA-1',
  '6th Sem PCA-2',
  'Signature Image'
];

export function sortFieldsByCanonicalOrder<T extends { label: string }>(fields: T[]): T[] {
  return [...fields].sort((a, b) => {
    let idxA = CANONICAL_FIELD_ORDER.indexOf(a.label);
    let idxB = CANONICAL_FIELD_ORDER.indexOf(b.label);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });
}

export function sortLabelsByCanonicalOrder(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    let idxA = CANONICAL_FIELD_ORDER.indexOf(a);
    let idxB = CANONICAL_FIELD_ORDER.indexOf(b);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });
}
