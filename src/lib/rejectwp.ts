import { FlagProblem } from './flags/problemcollector';

export function formatProblemText(p: FlagProblem): string {
  if (p.isDocRejection) {
    if (p.comment && p.comment.trim() !== '') {
      return `${p.field} is rejected: ${p.comment.trim()}`;
    }
    return `${p.field} is rejected.`;
  }
  if (p.comment && p.comment.trim() !== '') {
    return `${p.field}: ${p.comment.trim()}`;
  }
  return `${p.field} is having a problem or is incorrect.`;
}

export function generateRejectMessage(personName: string, problems: FlagProblem[]): string {
  const name = personName && personName.trim() ? personName.trim() : 'Applicant';
  
  const problemLines = problems && problems.length > 0
    ? problems.map((p, idx) => `${idx + 1}. ${formatProblemText(p)}`).join('\n')
    : `1. General verification failure. Please review your submission.`;

  const hasDocRejection = problems.some(p => p.isDocRejection);
  const closingStatement = hasDocRejection
    ? "I will delete your old response. You need to resubmit it again. Please verify."
    : "Please edit your response.";

  return `Hello ${name},\n\nWe found the following issue(s) with your submission:\n\n${problemLines}\n\n${closingStatement}`;
}

export function openRejectWhatsApp(phone: string | null | undefined, personName: string, problems: FlagProblem[]): string {
  const message = generateRejectMessage(personName, problems);

  if (typeof window !== 'undefined' && phone) {
    let cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone) {
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        cleanPhone = '91' + cleanPhone.substring(1);
      }
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  return message;
}
