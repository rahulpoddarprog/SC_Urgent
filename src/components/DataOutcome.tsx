import React from "react";
import { IdentityRecord } from "./ui/Search";

interface DataOutcomeProps {
  record: IdentityRecord;
  status: 'passed' | 'failed';
}

export default function DataOutcome({ record, status }: DataOutcomeProps) {
  const isPassed = status === 'passed';

  return (
    <div className={`max-w-md w-full border rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden transition-colors ${
      isPassed ? 'border-stat-green/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-stat-red/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
    }`}>
      <h2 className="text-lg font-display font-semibold text-pure-white tracking-wider flex items-center gap-2 justify-center">
        RECORD PROCESSED
      </h2>
      
      <div className={`mt-4 mb-6 p-3 rounded-xl flex items-center justify-center border ${
        isPassed ? 'border-stat-green/20' : 'border-stat-red/20'
      }`}>
        <span className={`text-sm font-bold uppercase tracking-widest ${isPassed ? 'text-stat-green' : 'text-stat-red'}`}>
          Outcome: {status}
        </span>
      </div>

      <div className="text-left font-mono text-xs flex flex-col gap-3 border-t border-neutral-800 pt-6 opacity-70">
        <div>
          <span className="text-neutral-500">CASE TYPE:</span>{" "}
          <span className="text-pure-white font-semibold">{record.caseType}</span>
        </div>
        <div>
          <span className="text-neutral-500">SERIAL NO:</span>{" "}
          <span className="text-pure-white font-semibold">{record.serialNo}</span>
        </div>
        <div>
          <span className="text-neutral-500">APPLICANT NAME:</span>{" "}
          <span className="text-pure-white font-semibold">{record.name}</span>
        </div>
        <div>
          <span className="text-neutral-500">TIMESTAMP:</span>{" "}
          <span className="text-pure-white font-semibold">
            {new Date(record.timestamp).toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-neutral-500">SHEET ROW INDEX:</span>{" "}
          <span className="text-neutral-500">#{record.rowIndex}</span>
        </div>
      </div>
    </div>
  );
}
