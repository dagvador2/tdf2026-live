"use client";

import { formatTime } from "@/lib/utils/formatters";

interface GapDisplayProps {
  label: string;
  gap: number | null; // seconds, null = leader or no data
  riderName?: string;
  isLeader?: boolean;
}

export function GapDisplay({
  label,
  gap,
  riderName,
  isLeader,
}: GapDisplayProps) {
  const displayValue = isLeader ? "LEADER" : gap !== null ? formatTime(gap) : "—";
  const textColor = isLeader
    ? "text-[#F2C200]"
    : gap !== null
      ? "text-white"
      : "text-gray-500";

  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-900 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <span
        className={`font-mono text-4xl font-bold leading-tight ${textColor}`}
      >
        {displayValue}
      </span>
      {riderName && (
        <span className="mt-1 text-xs text-gray-500">{riderName}</span>
      )}
    </div>
  );
}
