import { Activity, Timer } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";


export function LiveScoreboard({
  homeName,
  awayName,
  homeScore,
  awayScore,
  status,
  period,
  clock,
  context,
}: {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  status: string;
  period: string;
  clock: string;
  context: string;
}) {
  return (
    <section className="page-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Central ao vivo</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-white md:text-5xl">{homeName} x {awayName}</h1>
          <p className="mt-2 text-sm text-[--color-text-400]">{context}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="info">{status}</StatusBadge>
          <StatusBadge tone="neutral">{period}</StatusBadge>
          <div className="rounded-full border border-cyan-300/18 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            <span className="inline-flex items-center gap-2"><Timer className="h-4 w-4" /> {clock}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[--color-text-400]">Mandante</p>
          <strong className="mt-3 block text-3xl text-white md:text-4xl">{homeName}</strong>
        </div>
        <div className="rounded-[34px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-6 py-5">
          <div className="flex items-center gap-5">
            <span className="font-[family-name:var(--font-manrope)] text-7xl font-extrabold tracking-[-0.08em] text-white md:text-8xl">{homeScore}</span>
            <Activity className="h-8 w-8 text-cyan-200" />
            <span className="font-[family-name:var(--font-manrope)] text-7xl font-extrabold tracking-[-0.08em] text-white md:text-8xl">{awayScore}</span>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6 text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-[--color-text-400]">Visitante</p>
          <strong className="mt-3 block text-3xl text-white md:text-4xl">{awayName}</strong>
        </div>
      </div>
    </section>
  );
}
