import { Clock3, RotateCcw } from "lucide-react";

import { describeEvent, formatEventMoment, getEventLabel } from "@/lib/live";
import type { MatchEventDetail } from "@/lib/types";


export function EventFeed({
  events,
  editable = false,
  onRevert,
}: {
  events: MatchEventDetail[];
  editable?: boolean;
  onRevert?: (event: MatchEventDetail) => void;
}) {
  if (!events.length) {
    return (
      <div className="empty-card">
        <strong className="text-base text-white">O feed ainda esta limpo.</strong>
        <p className="mt-2 text-sm text-[--color-text-400]">Os eventos vao surgir em ordem cronologica assim que a cabine comecar a operar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article key={event.id} className={`rounded-[24px] border border-white/8 bg-white/[0.03] p-4 ${event.is_reverted ? "opacity-45" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-cyan-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatEventMoment(event)}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">{getEventLabel(event.event_type)}</span>
              </div>
              <p className="text-sm leading-6 text-[--color-text-300]">{describeEvent(event)}</p>
            </div>
            {editable && onRevert && !event.is_reverted ? (
              <button type="button" className="btn-ghost" onClick={() => onRevert(event)}>
                <RotateCcw className="h-4 w-4" />
                Desfazer
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
