import { levenshteinDistance, normalizeString } from './basicdataflag';

export const VALID_BACKLOG_OPTIONS = [
  "I had backlogs, but I was not given the opportunity to fill out the form due to my payment status. Because of this, my admit card was not released, and I was unable to sit for my examinations.",
  "I had backlogs and my admit card was released, but because I didn't pay the arrear fee, I was not allowed to sit for examinations scheduled on or before March 16th, 2026; however, I was allowed to sit for examinations scheduled after that date.",
  "I had backlogs, and I was fully allowed to sit for all my examinations because I either paid the arrear fee or I was already regularly paying the revised fee structure.",
  "I had backlogs, and although I was allowed to sit for one or all of my examinations, but I did not clear the arrear fees.",
  "No, I didn't have any backlogs."
];

export interface BacklogFlagResult {
  isValid: boolean;
  message: string;
}

export function validateBacklogOption(enteredValue: string): BacklogFlagResult {
  if (!enteredValue || enteredValue.trim() === '') {
    return { isValid: false, message: 'Empty response' };
  }

  const normEntered = normalizeString(enteredValue);
  
  // Try exact normalized match first
  for (const option of VALID_BACKLOG_OPTIONS) {
    if (normEntered === normalizeString(option)) {
      return { isValid: true, message: 'Valid Option' };
    }
  }

  // If not exact, allow a fuzzy match threshold (since these are long strings, maybe a distance of 10)
  for (const option of VALID_BACKLOG_OPTIONS) {
    const normOpt = normalizeString(option);
    const dist = levenshteinDistance(normEntered, normOpt);
    // If it's less than 10 characters off, we can assume it's the same option
    if (dist <= 10) {
      return { isValid: true, message: 'Valid Option (Fuzzy Match)' };
    }
  }

  return { isValid: false, message: 'Mismatch: Unrecognized option selected' };
}
