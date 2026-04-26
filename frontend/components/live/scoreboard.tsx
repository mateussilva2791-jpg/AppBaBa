import { Activity } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";


type ScoreboardProps = {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  homeColor?: string | null;
  awayColor?: string | null;
  status: string;
  meta?: string;
};

export function Scoreboard({
  homeName,
  awayName,
  homeScore,
  awayScore,
  homeColor,
  awayColor,
  status,
  meta,
}: ScoreboardProps) {
  return (
    <section className="page-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone="info">{status}</StatusBadge>
        {meta ? <span className="text-sm text-[--color-text-400]">{meta}</span> : null}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="flex items-center gap-3">
          <span className="h-16 w-2 rounded-full" style={{ background: homeColor ?? "#26b874" }} />
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[--color-text-400]">Mandante</p>
            <strong className="text-2xl text-white">{homeName}</strong>
          </div>
        </div>
        <div className="rounded-[28px] bg-white/[0.05] px-6 py-4 text-center">
          <div className="flex items-center gap-4">
            <span className="font-[family-name:var(--font-manrope)] text-6xl font-extrabold tracking-[-0.08em] text-white">{homeScore}</span>
            <Activity className="h-6 w-6 text-sky-300" />
            <span className="font-[family-name:var(--font-manrope)] text-6xl font-extrabold tracking-[-0.08em] text-white">{awayScore}</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <div className="text-right">
            <p className="text-sm uppercase tracking-[0.18em] text-[--color-text-400]">Visitante</p>
            <strong className="text-2xl text-white">{awayName}</strong>
          </div>
          <span className="h-16 w-2 rounded-full" style={{ background: awayColor ?? "#5cb7ff" }} />
        </div>
      </div>
    </section>
  );
}
