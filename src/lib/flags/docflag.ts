export interface RejectedDocInfo {
  isRejected: boolean;
  reason: string;
}

export type RejectedDocsMap = Record<string, RejectedDocInfo>;

export function countRejectedDocuments(rejectedDocs?: RejectedDocsMap | null): number {
  if (!rejectedDocs) return 0;
  let count = 0;
  Object.values(rejectedDocs).forEach(doc => {
    if (doc && doc.isRejected) {
      count += 1;
    }
  });
  return count;
}
