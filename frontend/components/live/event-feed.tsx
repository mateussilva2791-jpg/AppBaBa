import { RotateCcw } from "lucide-react";

import { describeEvent, formatEventMoment, getEventLabel } from "@/lib/live";
import type { MatchEventDetail } from "@/lib/types";

const EVENT_EMOJI: Partial<Record<string, string>> = {
  GOAL:                "⚽",
  ASSIST:              "👟",
  FOUL:                "🤚",
  YELLOW_CARD:         "🟨",
  RED_CARD:            "🟥",
  MATCH_STARTED:       "▶",
  HALF_TIME:           "//",
  SECOND_HALF_STARTED: "▶▶",
  MATCH_FINISHED:      "■",
};

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
      <div className="rounded-[20px] border border-dashed border-white/8 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-sm text-[--color-text-muted]">Nenhum evento ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {events.map((event) => (
        <div
          key={event.id}
          className={[
            "flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2.5 transition-all",
            event.is_reverted ? "opacity-35 line-through" : "",
          ].join(" ")}
        >
          {/* Emoji */}
          <span className="mt-0.5 shrink-0 text-base leading-none">
            {EVENT_EMOJI[event.event_type] ?? "•"}
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[--color-text-muted]">
                {formatEventMoment(event)}
              </span>
              <span className="text-[10px] text-[--color-text-muted]">
                {getEventLabel(event.event_type)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm font-medium text-white">
              {describeEvent(event)}
            </p>
          </div>

          {/* Undo */}
          {editable && onRevert && !event.is_reverted ? (
            <button
              type="button"
              onClick={() => onRevert(event)}
              className="shrink-0 rounded-lg border border-white/8 bg-white/[0.04] p-1.5 text-[--color-text-muted] transition hover:border-red-400/20 hover:bg-red-400/8 hover:text-red-300"
              title="Desfazer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
