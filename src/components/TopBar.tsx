import React from "react";
import Stats from "./ui/Stats";
import Records from "./ui/Records";
import Approve from "./ui/Approve";
import Reject from "./ui/Reject";
import Search, { IdentityRecord } from "./ui/Search";
import SyncData from "./ui/SyncData";

interface TopBarProps {
  stats: { total: number; passed: number; failed: number; pending: number; };
  records: IdentityRecord[];
  currentRecordIndex: number;
  isLoading: boolean;
  isSyncing?: boolean;
  onSync?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setCurrentRecordIndex: (idx: number) => void;
  handleApprove: () => void;
  handleReject: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function TopBar({
  stats,
  records,
  currentRecordIndex,
  isLoading,
  isSyncing = false,
  onSync,
  searchQuery,
  setSearchQuery,
  setCurrentRecordIndex,
  handleApprove,
  handleReject,
  onPrev,
  onNext,
}: TopBarProps) {
  return (
    <header className="w-full bg-pure-black px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 border-b border-neutral-800">
      {/* Left Side: Statistics representation & Sync button */}
      <div className="flex items-center gap-3 flex-wrap">
        <Stats stats={stats} />
        <SyncData onSync={onSync} isSyncing={isSyncing} disabled={isLoading} />
      </div>

      {/* Center: Controls for Record Navigation and Actions */}
      <div className="flex items-center gap-3">
        <Records
          recordNumber={records[currentRecordIndex] ? currentRecordIndex + 1 : 0}
          totalRecords={records.length}
          onQueueSelect={(start) => {
            if (start >= 0 && start < records.length) {
              setCurrentRecordIndex(start);
            }
          }}
          onPrev={onPrev}
          onNext={onNext}
        />
        <Approve onClick={handleApprove} disabled={isLoading || records.length === 0} />
        <Reject onClick={handleReject} disabled={isLoading || records.length === 0} />
      </div>

      {/* Right Side: Fast Client-side Search */}
      <Search
        value={searchQuery}
        onChange={setSearchQuery}
        records={records}
        onSelectRecord={(rec) => {
          const idx = records.findIndex((r) => r.rowIndex === rec.rowIndex);
          if (idx !== -1) {
            setCurrentRecordIndex(idx);
          }
        }}
      />
    </header>
  );
}
