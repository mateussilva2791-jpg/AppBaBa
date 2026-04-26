import type { ReactNode } from "react";

import { formatStatusLabel, type StatusTone } from "@/lib/ui";

const toneMap: Record<StatusTone, string> = {
  neutral: "border-white/10 bg-white/[0.06] text-[--color-text-200]",
  success: "border-emerald-400/20 bg-emerald-400/12 text-emerald-100",
  info: "border-cyan-400/20 bg-cyan-400/12 text-cyan-100",
  warning: "border-amber-300/20 bg-amber-300/12 text-amber-100",
  danger: "border-rose-400/20 bg-rose-400/12 text-rose-100",
};

export function StatusBadge({
  children,
  tone = "neutral",
  label,
}: {
  children: ReactNode;
  tone?: StatusTone;
  label?: string;
}) {
  return <span className={`status-badge ${toneMap[tone]}`}>{label ?? formatStatusLabel(String(children))}</span>;
}
