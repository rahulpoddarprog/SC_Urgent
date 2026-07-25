"use client";

import React, { useState } from "react";

export interface IdentityRecord {
  rowIndex: number;
  caseType: string;
  serialNo: string;
  name: string;
  identityString: string;
  timestamp: string;
}

interface SearchProps {
  value?: string;
  onChange?: (val: string) => void;
  records?: IdentityRecord[];
  onSelectRecord?: (record: IdentityRecord) => void;
}

export default function Search({
  value = "",
  onChange,
  records = [],
  onSelectRecord,
}: SearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  const query = value.trim().toLowerCase();

  // If query starts with # (like #12) or is a digit (like 12), match the row number
  const isRowSearch = query.startsWith("#")
    ? query.slice(1)
    : !isNaN(Number(query)) && query !== ""
    ? query
    : null;

  const filteredRecords = query
    ? records.filter((r) => {
        if (isRowSearch) {
          // Check if row index contains the search string
          return r.rowIndex.toString().includes(isRowSearch);
        }
        return r.identityString.toLowerCase().includes(query);
      })
    : [];

  return (
    <div className="relative w-full md:w-64 font-sans">
      <div className="relative flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-3.5 h-3.5 text-pure-white absolute left-3 pointer-events-none"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z"
          />
        </svg>

        <input
          type="text"
          placeholder="Search Case, Sl #, Name..."
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-pure-black border border-pure-white text-pure-white text-xs rounded-full pl-8 pr-7 py-1 outline-none font-semibold placeholder:text-pure-white/50 focus:ring-1 focus:ring-pure-white transition-all"
        />

        {value && (
          <button
            onClick={() => {
              onChange?.("");
              setIsOpen(false);
            }}
            className="absolute right-3 text-pure-white/70 hover:text-pure-white cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Middle Aligned Dropdown Results with Custom Scrollbar */}
      {isOpen && value.trim().length > 0 && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-pure-black border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto w-full md:w-[340px] p-1.5 backdrop-blur-md [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((rec) => (
              <div
                key={rec.rowIndex}
                onClick={() => {
                  onSelectRecord?.(rec);
                  onChange?.("");
                  setIsOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl hover:bg-pure-white/10 cursor-pointer flex items-center justify-between text-xs font-semibold text-pure-white transition-colors"
              >
                <span className="truncate max-w-[220px] tracking-wide">
                  {rec.identityString}
                </span>
                <span className="text-pure-white/40 text-[10px] font-mono shrink-0 ml-2">
                  Row #{rec.rowIndex}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-pure-white/50 italic text-center font-mono">
              No matching records
            </div>
          )}
        </div>
      )}
    </div>
  );
}
