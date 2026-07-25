"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RecordsProps {
  recordNumber?: number;
  totalRecords?: number;
  onQueueSelect?: (startIndex: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function Records({
  recordNumber = 1,
  totalRecords = 0,
  onQueueSelect,
  onPrev,
  onNext,
}: RecordsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chunks = [];
  if (totalRecords > 0) {
    for (let i = 0; i < totalRecords; i += 50) {
      chunks.push({
        start: i + 1,
        end: Math.min(i + 50, totalRecords),
        startIndex: i,
        endIndex: i + 49,
      });
    }
  }

  const isFirst = recordNumber <= 1;
  const isLast = recordNumber >= totalRecords;

  return (
    <div className="flex items-center gap-2 select-none font-sans" ref={dropdownRef}>
      {/* Left Navigation Arrow */}
      <button
        onClick={onPrev}
        disabled={isFirst}
        className={`p-1 rounded-full transition-all flex items-center justify-center ${
          isFirst
            ? "text-neutral-600 cursor-not-allowed bg-transparent"
            : "text-action-cyan bg-pure-white/5 hover:bg-pure-white/15 cursor-pointer border border-pure-white/10"
        }`}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Center: Dropdown Trigger Button */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1 text-xs font-mono font-bold text-pure-white tracking-wider px-3 py-1 bg-pure-white/10 hover:bg-pure-white/20 transition-all rounded-full border border-pure-white/20 cursor-pointer"
        >
          #{recordNumber} Record
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3 h-3 text-action-cyan transition-transform ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

      {/* Middle Aligned, Premium Card-Styled Dropdown */}
      {dropdownOpen && chunks.length > 0 && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-pure-black border border-neutral-800 backdrop-blur-md rounded-2xl shadow-2xl z-[150] overflow-hidden min-w-[150px] p-1.5">
          {chunks.map((c, idx) => (
            <React.Fragment key={idx}>
              <div
                className="px-4 py-2.5 rounded-xl text-xs text-pure-white hover:bg-action-cyan/20 hover:text-action-cyan cursor-pointer font-mono transition-colors text-center"
                onClick={() => {
                  if (onQueueSelect) onQueueSelect(c.startIndex);
                  setDropdownOpen(false);
                }}
              >
                {c.start} to {c.end}
              </div>
              {/* 50% Divider Line between entries */}
              {idx < chunks.length - 1 && (
                <div className="w-1/2 h-[1px] bg-neutral-800/50 mx-auto" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      </div>

      {/* Right Navigation Arrow */}
      <button
        onClick={onNext}
        disabled={isLast}
        className={`p-1 rounded-full transition-all flex items-center justify-center ${
          isLast
            ? "text-neutral-600 cursor-not-allowed bg-transparent"
            : "text-action-cyan bg-pure-white/5 hover:bg-pure-white/15 cursor-pointer border border-pure-white/10"
        }`}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
