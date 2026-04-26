import { TimerReset } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { getBracketMatchTitle, getBracketStageLabel } from "@/lib/session";
import { getStatusTone } from "@/lib/ui";
import type { LiveMatchCard } from "@/lib/types";


export function MatchCard({
  item,
  href,
}: {
  item: LiveMatchCard;
  href?: string;
}) {
  const isLive = item.match.status === "ao_vivo";

  return (
    <article className={`surface-soft group flex flex-col gap-5 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${isLive ? "ring-1 ring-[rgba(0,230,118,0.18)]" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isLive ? <span className="live-dot" /> : null}
            <p className="eyebrow">Partida</p>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[--color-text-400]">
            {getBracketStageLabel(item.match.stage)}
          </p>
        </div>
        <StatusBadge tone={getStatusTone(item.match.status)}>{item.match.status}</StatusBadge>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white">{getBracketMatchTitle(item.match)}</p>
            <div className="mt-2 space-y-1">
              <p className="truncate text-sm font-medium text-white">{item.home_team_name}</p>
              <p className="truncate text-sm text-[--color-text-400]">{item.away_team_name}</p>
            </div>
          </div>

          <div className="shrink-0 rounded-[22px] border border-white/10 bg-white/[0.05] px-5 py-3 text-center">
            <strong className="score-display font-[family-name:var(--font-manrope)] text-3xl tracking-[-0.06em] text-white">
              {item.match.home_score}
              <span className="mx-1 text-[--color-text-400]">:</span>
              {item.match.away_score}
            </strong>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.04] p-3 text-sm text-[--color-text-400]">
          <span className="inline-flex items-center gap-2">
            <TimerReset className="h-4 w-4 shrink-0 text-sky-300" />
            {item.last_event
              ? (item.last_event.notes ?? item.last_event.event_type)
              : "Sem evento recente"}
          </span>
        </div>
      </div>

      {href ? (
        <Link href={href} className={isLive ? "btn-primary" : "btn-secondary"}>
          Operar partida
        </Link>
      ) : null}
    </article>
  );
}
