import React from "react";

interface ApproveProps {
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function Approve({
  onClick,
  disabled = false,
  isLoading = false,
}: ApproveProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="flex items-center gap-1 px-3 py-1 bg-stat-green hover:bg-stat-green/80 active:scale-95 text-pure-white font-sans font-bold text-xs rounded-full transition-all disabled:opacity-50 cursor-pointer"
      title="Approve Record & Sync to Clean Sheet"
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
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Approve</span>
    </button>
  );
}
