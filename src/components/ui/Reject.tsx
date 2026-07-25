import React from "react";

interface RejectProps {
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function Reject({
  onClick,
  disabled = false,
  isLoading = false,
}: RejectProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="flex items-center gap-1 px-3 py-1 bg-stat-red hover:bg-stat-red/80 active:scale-95 text-pure-white font-sans font-bold text-xs rounded-full transition-all disabled:opacity-50 cursor-pointer"
      title="Reject Record & Mark Status"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        className="w-3 h-3 text-pure-white"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Reject</span>
    </button>
  );
}
