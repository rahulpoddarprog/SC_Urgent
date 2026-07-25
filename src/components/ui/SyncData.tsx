import React from "react";
import { RefreshCw } from "lucide-react";

interface SyncDataProps {
  onSync?: () => void;
  isSyncing?: boolean;
  disabled?: boolean;
}

export default function SyncData({
  onSync,
  isSyncing = false,
  disabled = false,
}: SyncDataProps) {
  return (
    <button
      onClick={onSync}
      disabled={disabled || isSyncing}
      className="flex items-center gap-1 px-3 py-1 bg-stat-green hover:bg-stat-green/80 active:scale-95 text-pure-white font-sans font-bold text-xs rounded-full transition-all disabled:opacity-50 cursor-pointer shadow-sm"
      title="Sync Data from Sheets & Firebase"
    >
      <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
      <span>{isSyncing ? "Syncing Data..." : "Sync Data"}</span>
    </button>
  );
}
