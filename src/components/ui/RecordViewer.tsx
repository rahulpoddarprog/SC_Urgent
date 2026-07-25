import React from "react";
import { Check, AlertTriangle } from 'lucide-react';
import { IdentityRecord } from "./Search";
import { getCleanLabel, sortFieldsByCanonicalOrder } from '@/lib/header_map';
import { TargetRecordInfo } from '@/lib/sheet/targetpull';
import { validateAgainstTarget, RecordFlag } from '@/lib/flags/basicdataflag';
import { calculateExtraFee, FeeCalculationResult } from '@/lib/flags/extrapaid';
import { calculateLateFine, LateFineResult } from '@/lib/flags/latefine';
import { validateBacklogOption, BacklogFlagResult } from '@/lib/flags/hasbackflag';
import { countTotalFlags } from '@/lib/flags/flagcounter';
import { validateBackinfoFields, BackinfoResultsMap } from '@/lib/flags/backinfoflag';
import { validateAllFormatFields, FormatResultsMap, isFormatField, validateFormatField } from '@/lib/flags/formatflag';
import { validateArrearOption, validateArrearDependentFields, ArrearFlagResult, ArrearDependentResultsMap } from '@/lib/flags/arrearflag';

import { RejectedDocsMap } from '@/lib/flags/docflag';

interface RecordViewerProps {
  record: IdentityRecord | undefined;
  rawData?: Record<string, string>;
  targetRecords?: TargetRecordInfo[];
  rejectedDocs?: RejectedDocsMap;
}

export default function RecordViewer({ record, rawData, targetRecords, rejectedDocs }: RecordViewerProps) {
  if (!record) {
    return (
      <div className="w-full border border-pure-white/20 rounded-2xl p-4 flex flex-col justify-center items-center h-full bg-pure-black/20 backdrop-blur-sm">
        <p className="text-sm text-pure-white/50 font-mono italic">
          No remaining records to verify.
        </p>
      </div>
    );
  }

  // Create an array of field objects to map over
  let fields: { label: string; value: string; rawKey?: string }[] = [];
  let feeCalcResult: FeeCalculationResult | null = null;
  let lateFineResult: LateFineResult | null = null;
  let backlogResult: BacklogFlagResult | null = null;
  let backinfoResults: BackinfoResultsMap | null = null;
  let formatResults: FormatResultsMap | null = null;
  let arrearResult: ArrearFlagResult | null = null;
  let arrearDependentResults: ArrearDependentResultsMap | null = null;

  if (rawData && Object.keys(rawData).length > 0) {
    fields = Object.entries(rawData).map(([rawKey, value]) => ({ label: getCleanLabel(rawKey), value, rawKey }));
    fields = sortFieldsByCanonicalOrder(fields);
    formatResults = validateAllFormatFields(rawData);
    
    // Find department, paid semesters, and claimed extra amount
    let dept = '';
    let paidSems = '';
    let extraAmount = '';
    let lateFineAmount = '';
    let backlogVal = '';
    let arrearVal = '';
    
    Object.entries(rawData).forEach(([k, v]) => {
      const lower = k.toLowerCase();
      if (lower.includes('department')) dept = v;
      if (lower.includes('paid fees as per the new fee structure') || lower.includes('please select multiple options')) paidSems = v;
      if (lower.includes('total extra amount paid') || lower.includes('extra amount')) extraAmount = v;
      if (lower.includes('late fine paid') || lower.includes('total late fine paid')) lateFineAmount = v;
      if (lower.includes('for students who had a backlog') || lower.includes('non-allowance in march 2026') || lower.includes('non‑allowance in march 2026')) backlogVal = v;
      if (lower.includes('after the dismissal of the case') || lower.includes('cleared all the arrear fees')) arrearVal = v;
    });

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
  } else {
    // Fallback to basic fields if rawData isn't loaded yet
    fields = [
      { label: "Case Type", value: record.caseType },
      { label: "Serial No", value: record.serialNo },
      { label: "Name", value: record.name },
      { label: "Timestamp", value: new Date(record.timestamp).toLocaleString() },
      { label: "Sheet Row Index", value: `#${record.rowIndex}` },
    ];
  }

  // Run validation
  let flags: RecordFlag[] = [];
  let matchedPhone = null;

  if (rawData && targetRecords && targetRecords.length > 0) {
    const validationResult = validateAgainstTarget(rawData, targetRecords);
    flags = validationResult.flags;
    matchedPhone = validationResult.matchedPhone;
  }

  // Append phone number if matched
  if (matchedPhone) {
    fields.push({ label: 'Contact No.', value: matchedPhone });
  }

  const totalFlags = countTotalFlags(flags, feeCalcResult, lateFineResult, backlogResult, backinfoResults, rejectedDocs, formatResults, arrearResult, arrearDependentResults);

  return (
    <div className="w-full h-full flex flex-col border border-pure-white/20 rounded-2xl p-4 bg-pure-black/30 backdrop-blur-sm text-left">
      {/* Header section from main branch design */}
      <div className="flex items-start justify-between border-b border-pure-white/20 pb-3 mb-3 shrink-0">
        <h2 className="text-sm font-bold text-pure-white font-mono break-words whitespace-normal leading-tight" title={record.identityString}>
          {record.identityString || 'Unknown Record'}
        </h2>
        {totalFlags > 0 ? (
          <span className="w-5 h-5 rounded-full text-[10px] font-bold bg-stat-red text-pure-white flex items-center justify-center shrink-0 ml-2">
            {totalFlags}
          </span>
        ) : (
          <span className="w-5 h-5 rounded-full text-[10px] font-bold bg-pure-white/20 text-pure-white flex items-center justify-center shrink-0 ml-2">
            0
          </span>
        )}
      </div>

      {/* Scrollable Data Container */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
        {fields.map((field, idx) => {
          const isDrive = String(field.value).includes('drive.google.com') || String(field.value).includes('docs.google.com');

          // Check if this field has a specific flag (like NAME_MISMATCH for Name)
          const fieldFlags = flags.filter(f => f.field === field.label);
          // Also, if MISSING_FIELD applies to Case Type or Serial No, show it
          if (flags.some(f => f.code === 'MISSING_FIELD' && f.message.includes('Target Sheet')) && (field.label === 'Case Type' || field.label === 'Sl No.')) {
            fieldFlags.push({ code: 'MISSING_FIELD', level: 'WARNING', message: 'Target record not found' });
          }

          let badge = null;
          if (arrearDependentResults && arrearDependentResults[field.label]?.status === 'NA') {
            badge = (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pure-white bg-pure-white/10 px-1.5 py-0.5 rounded border border-pure-white/20 whitespace-nowrap">
                N/A
              </span>
            );
          } else if (arrearDependentResults && arrearDependentResults[field.label]?.status === 'EMPTY') {
            badge = (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-red bg-stat-red/20 px-1.5 py-0.5 rounded border border-stat-red/50 whitespace-nowrap">
                <AlertTriangle className="w-3 h-3" /> EMPTY
              </span>
            );
          } else if (field.label === 'Cleared Arrears') {
            if (arrearResult && arrearResult.status === 'VALID') {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-green bg-stat-green/20 px-1.5 py-0.5 rounded border border-stat-green/40 whitespace-nowrap">
                  <Check className="w-3 h-3" /> VALID
                </span>
              );
            } else if (arrearResult && arrearResult.status === 'MISMATCH') {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-yellow bg-stat-yellow/20 px-1.5 py-0.5 rounded border border-stat-yellow/50 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" /> MISMATCH
                </span>
              );
            }
          } else if (fieldFlags.length > 0) {
            badge = (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-red bg-stat-red/20 px-1.5 py-0.5 rounded border border-stat-red/50 whitespace-nowrap">
                <AlertTriangle className="w-3 h-3" /> Mismatch
              </span>
            );
          } else if (rawData && targetRecords && (field.label === 'Name' || field.label === 'Case Type' || field.label === 'Sl No.')) {
            // If rawData is loaded and there are target records, but NO flags for this field, it's valid!
            badge = (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-green bg-stat-green/20 px-1.5 py-0.5 rounded border border-stat-green/40 whitespace-nowrap">
                <Check className="w-3 h-3" /> Valid
              </span>
            );
          } else if (feeCalcResult && field.label === 'Extra Amount Paid') {
            if (feeCalcResult.isMatch) {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-green bg-stat-green/20 px-1.5 py-0.5 rounded border border-stat-green/40 whitespace-nowrap">
                  <Check className="w-3 h-3" /> VALID
                </span>
              );
            } else {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-red bg-stat-red/20 px-1.5 py-0.5 rounded border border-stat-red/50 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" /> MISMATCH
                </span>
              );
            }
          } else if (lateFineResult && field.label === 'Late Fine Paid') {
            if (lateFineResult.status === 'VALID') {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-green bg-stat-green/20 px-1.5 py-0.5 rounded border border-stat-green/40 whitespace-nowrap">
                  <Check className="w-3 h-3" /> VALID
                </span>
              );
            } else if (lateFineResult.status === 'MISMATCH') {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-yellow bg-stat-yellow/20 px-1.5 py-0.5 rounded border border-stat-yellow/50 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" /> MISMATCH
                </span>
              );
            } else {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-yellow bg-stat-yellow/20 px-1.5 py-0.5 rounded border border-stat-yellow/50 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" /> INVALID
                </span>
              );
            }
          } else if (backlogResult && field.label === 'Has Backlogs') {
            if (backlogResult.isValid) {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-green bg-stat-green/20 px-1.5 py-0.5 rounded border border-stat-green/40 whitespace-nowrap">
                  <Check className="w-3 h-3" /> VALID
                </span>
              );
            } else {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-yellow bg-stat-yellow/20 px-1.5 py-0.5 rounded border border-stat-yellow/50 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" /> MISMATCH
                </span>
              );
            }
          } else if (backinfoResults && backinfoResults[field.label]) {
            const bRes = backinfoResults[field.label];
            if (bRes.status === 'VALID') {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-green bg-stat-green/20 px-1.5 py-0.5 rounded border border-stat-green/40 whitespace-nowrap">
                  <Check className="w-3 h-3" /> VALID
                </span>
              );
            } else if (bRes.status === 'NA') {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pure-white bg-pure-white/10 px-1.5 py-0.5 rounded border border-pure-white/20 whitespace-nowrap">
                  N/A
                </span>
              );
            } else {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-red bg-stat-red/20 px-1.5 py-0.5 rounded border border-stat-red/50 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" /> {bRes.badgeLabel}
                </span>
              );
            }
          } else if (isFormatField(field.label)) {
            const fRes = (formatResults && formatResults[field.label]) || validateFormatField(field.value, field.label);
            if (fRes.status === 'VALID') {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-green bg-stat-green/20 px-1.5 py-0.5 rounded border border-stat-green/40 whitespace-nowrap">
                  <Check className="w-3 h-3" /> VALID
                </span>
              );
            } else {
              badge = (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stat-red bg-stat-red/20 px-1.5 py-0.5 rounded border border-stat-red/50 whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3" /> {fRes.badgeLabel}
                </span>
              );
            }
          }

          return (
            <div
              key={idx}
              className="p-2 rounded-lg border border-pure-white/20 transition-colors bg-pure-white/5 hover:bg-pure-white/10"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[11px] text-action-cyan font-bold truncate pr-2"
                  title={field.label}
                >
                  {field.label.toUpperCase()}
                </span>
                {badge}
              </div>
              
              {isDrive && field.value ? (
                <a
                  href={field.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-action-cyan hover:text-action-cyan/80 hover:underline break-all block mt-1"
                >
                  {field.value}
                </a>
              ) : (
                <div className="text-xs whitespace-pre-wrap text-pure-white">
                  {field.value || 'Empty'}
                </div>
              )}

              {(!arrearDependentResults || arrearDependentResults[field.label]?.status !== 'NA') && (
                <>
                  {fieldFlags.map((ff, i) => (
                    <div key={i} className="mt-1 text-[10px] text-stat-red/90">
                      {ff.message}
                    </div>
                  ))}
                  {feeCalcResult && field.label === 'Extra Amount Paid' && !feeCalcResult.isMatch && (
                    <div className="mt-1 text-[10px] text-stat-red/90 font-mono">
                      {feeCalcResult.breakdown}
                    </div>
                  )}
                  {lateFineResult && field.label === 'Late Fine Paid' && lateFineResult.status !== 'VALID' && (
                    <div className="mt-1 text-[10px] font-mono text-stat-yellow/90">
                      {lateFineResult.message}
                    </div>
                  )}
                  {backlogResult && field.label === 'Has Backlogs' && !backlogResult.isValid && (
                    <div className="mt-1 text-[10px] font-mono text-stat-yellow/90">
                      {backlogResult.message}
                    </div>
                  )}
                </>
              )}
              {arrearResult && field.label === 'Cleared Arrears' && !arrearResult.isValid && (
                <div className="mt-1 text-[10px] font-mono text-stat-yellow/90">
                  {arrearResult.message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollbar styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.8);
        }
      `}} />
    </div>
  );
}
