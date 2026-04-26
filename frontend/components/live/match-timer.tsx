import { Timer } from "lucide-react";

import { formatClock } from "@/lib/live";


type MatchTimerProps = {
  totalSeconds: number;
  status: string;
  running: boolean;
};

export function MatchTimer({ totalSeconds, status, running }: MatchTimerProps) {
  return (
    <section className="surface-soft flex items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${running ? "bg-emerald-400/12 text-emerald-200" : "bg-white/[0.06] text-[--color-text-300]"}`}>
          <Timer className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Cronometro</p>
          <strong className="mt-2 block font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-[-0.08em] text-white">
            {formatClock(totalSeconds)}
          </strong>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">{running ? "Ativo" : "Pausado"}</p>
        <strong className="mt-2 block text-white">{status}</strong>
      </div>
    </section>
  );
}
