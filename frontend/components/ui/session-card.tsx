import { CalendarDays, MapPin, Users } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { getStatusTone } from "@/lib/ui";
import type { SessionItem } from "@/lib/types";


function getProgressWidth(status: string): string {
  if (status === "encerrada" || status === "FINISHED") return "100%";
  if (status === "ao_vivo" || status === "LIVE") return "60%";
  return "20%";
}

export function SessionCard({
  session,
  href,
  actionLabel,
}: {
  session: SessionItem;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <article className="page-card flex flex-col gap-5 group/session">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Rodada</p>
          <h3 className="text-lg font-semibold leading-tight tracking-[-0.02em] text-[--color-text-primary]">
            {session.title}
          </h3>
        </div>
        <StatusBadge tone={getStatusTone(session.status)}>{session.status}</StatusBadge>
      </div>

      {/* Details */}
      <div className="grid gap-2.5 text-sm text-[--color-text-secondary]">
        <span className="inline-flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/10">
            <CalendarDays className="h-3.5 w-3.5 text-sky-300" />
          </span>
          {new Date(session.scheduled_at).toLocaleString("pt-BR")}
        </span>
        <span className="inline-flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/10">
            <MapPin className="h-3.5 w-3.5 text-sky-300" />
          </span>
          {session.location ?? "Local a definir"}
        </span>
        <span className="inline-flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/10">
            <Users className="h-3.5 w-3.5 text-sky-300" />
          </span>
          {session.team_count} times
          {session.team_size ? ` • ${session.team_size} por time` : ""}
        </span>
      </div>

      {/* Progress bar */}
      <div className="session-progress mt-auto">
        <div
          className="session-progress-fill"
          style={{ width: getProgressWidth(session.status) }}
        />
      </div>

      {/* CTA */}
      {href ? (
        <Link href={href} className="btn-secondary text-center">
          {actionLabel ?? "Abrir rodada"}
        </Link>
      ) : null}
    </article>
  );
}
