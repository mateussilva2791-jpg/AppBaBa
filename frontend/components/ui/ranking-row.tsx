"use client";

import { ArrowUpRight, Shield, Star } from "lucide-react";
import { useEffect, useRef } from "react";

import { PlayerAvatar } from "@/components/ui/player-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RankingEntry } from "@/lib/types";


const POSITION_STYLES = [
  {
    text: "text-[#f0b429]",
    bg: "bg-[rgba(240,180,41,0.12)]",
    ring: "ring-[rgba(240,180,41,0.2)]",
    barGrad: "linear-gradient(90deg,#f0b429,#ffd740)",
    rowClass: "rank-row rank-row-gold",
  },
  {
    text: "text-sky-300",
    bg: "bg-sky-400/10",
    ring: "ring-sky-400/20",
    barGrad: "linear-gradient(90deg,#60a5fa,#38bdf8)",
    rowClass: "rank-row",
  },
  {
    text: "text-emerald-300",
    bg: "bg-emerald-400/10",
    ring: "ring-emerald-400/20",
    barGrad: "linear-gradient(90deg,#4ade80,#34d399)",
    rowClass: "rank-row",
  },
];

function AnimatedBar({ value, max, accent }: { value: number; max: number; accent: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const id = requestAnimationFrame(() => { el.style.width = `${pct}%`; });
    return () => cancelAnimationFrame(id);
  }, [value, max]);

  return (
    <div className="session-progress mt-2">
      <div
        ref={barRef}
        className="session-progress-fill"
        style={{ width: "0%", background: accent, transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </div>
  );
}

export function RankingRow({
  entry,
  index,
  maxPoints,
  highlightState,
}: {
  entry: RankingEntry;
  index: number;
  maxPoints?: number;
  highlightState?: {
    isBestPlayer?: boolean;
    isTopScorer?: boolean;
    inTeamOfTheWeek?: boolean;
  };
}) {
  const style = POSITION_STYLES[index] ?? {
    text: "text-[--color-text-muted]",
    bg: "bg-white/5",
    ring: "ring-white/8",
    barGrad: "linear-gradient(90deg,rgba(154,184,158,0.4),rgba(154,184,158,0.2))",
    rowClass: "rank-row",
  };

  const topTone =
    index === 0 ? "warning" : index === 1 ? "info" : index === 2 ? "success" : "neutral";

  return (
    <div
      className={`${style.rowClass}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Position badge */}
      <div
        className={`rank-position ${style.text} ${style.bg} ring-1 ${style.ring}`}
      >
        {index + 1}
      </div>

      <PlayerAvatar name={entry.player_name} accent={index === 0 ? "gold" : "sky"} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-[--color-text-primary]">
            {entry.player_name}
          </p>
          {index < 3 && (
            <StatusBadge tone={topTone}>
              {index === 0 ? "Líder" : index === 1 ? "2º lugar" : "3º lugar"}
            </StatusBadge>
          )}
          {highlightState?.isBestPlayer && <StatusBadge tone="warning">MVP</StatusBadge>}
          {highlightState?.isTopScorer && <StatusBadge tone="info">Artilheiro</StatusBadge>}
          {highlightState?.inTeamOfTheWeek && <StatusBadge tone="success">Seleção</StatusBadge>}
        </div>

        <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-[--color-text-400]">
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3 w-3 text-[--color-accent-gold]" />
            {entry.goals} gols
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ArrowUpRight className="h-3 w-3 text-sky-300" />
            {entry.assists} assists
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-emerald-300" />
            {entry.clean_sheets} CS
          </span>
        </div>

        {maxPoints ? (
          <AnimatedBar value={entry.ranking_points} max={maxPoints} accent={style.barGrad} />
        ) : null}
      </div>

      {/* Points */}
      <div className="shrink-0 text-right">
        <strong
          className="block font-[family-name:var(--font-manrope)] text-2xl font-extrabold leading-none tracking-[-0.05em]"
          style={index === 0 ? { color: "#f0b429", textShadow: "0 0 18px rgba(240,180,41,0.3)" } : { color: "#f0f4f0" }}
        >
          {entry.ranking_points}
        </strong>
        <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-[--color-text-muted]">
          pts
        </span>
      </div>
    </div>
  );
}
