import { describeEvent, formatEventMoment, getEventLabel } from "@/lib/live";
import type { MatchEventDetail } from "@/lib/types";


type LiveFeedProps = {
  events: MatchEventDetail[];
  onEdit?: (event: MatchEventDetail) => void;
  onRevert?: (event: MatchEventDetail) => void;
  editable?: boolean;
};

export function LiveFeed({ events, onEdit, onRevert, editable }: LiveFeedProps) {
  if (events.length === 0) {
    return (
      <div className="empty-card">
        <strong className="text-base text-white">Nenhum evento ainda.</strong>
        <p className="mt-2 text-sm leading-6 text-[--color-text-400]">Os lances registrados vao aparecer aqui em ordem cronologica.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article key={event.id} className={`surface-soft flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between ${event.is_reverted ? "opacity-50" : ""}`}>
          <div className="rounded-2xl bg-sky-400/12 px-3 py-2 text-sm font-semibold text-sky-200">
            {formatEventMoment(event)}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-white">{getEventLabel(event.event_type)}</strong>
              {event.team_name ? <span className="text-sm text-[--color-text-400]">{event.team_name}</span> : null}
            </div>
            <p className="text-sm leading-6 text-[--color-text-300]">{describeEvent(event)}</p>
          </div>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              {onEdit && !event.is_reverted ? <button type="button" className="btn-ghost" onClick={() => onEdit(event)}>Editar</button> : null}
              {onRevert && !event.is_reverted ? <button type="button" className="btn-secondary" onClick={() => onRevert(event)}>Desfazer</button> : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
