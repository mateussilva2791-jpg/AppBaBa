"use client";

import { useEffect, useMemo, useState } from "react";

import { formatEventMoment } from "@/lib/live";
import type { MatchEventDetail, MatchEventType } from "@/lib/types";

type PlayerEventStats = {
  playerId: string;
  playerName: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  firstGoalOrder: number | null;
};

function getEventIcon(eventType: MatchEventType) {
  switch (eventType) {
    case "GOAL":
      return "⚽";
    case "ASSIST":
      return "👟";
    case "YELLOW_CARD":
      return "🟨";
    case "RED_CARD":
      return "🟥";
    default:
      return null;
  }
}

function shouldShowInTimeline(event: MatchEventDetail) {
  return !event.is_reverted && Boolean(getEventIcon(event.event_type));
}

function aggregatePlayerStats(events: MatchEventDetail[]) {
  const statsMap = new Map<string, PlayerEventStats>();
  let eventOrder = 0;

  for (const event of events) {
    if (event.is_reverted || !event.player_id || !event.player_name) {
      continue;
    }

    if (!statsMap.has(event.player_id)) {
      statsMap.set(event.player_id, {
        playerId: event.player_id,
        playerName: event.player_name,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        firstGoalOrder: null,
      });
    }

    const current = statsMap.get(event.player_id);
    if (!current) {
      continue;
    }

    switch (event.event_type) {
      case "GOAL":
        current.goals += 1;
        if (current.firstGoalOrder === null) {
          current.firstGoalOrder = eventOrder;
        }
        eventOrder += 1;
        break;
      case "ASSIST":
        current.assists += 1;
        break;
      case "YELLOW_CARD":
        current.yellowCards += 1;
        break;
      case "RED_CARD":
        current.redCards += 1;
        break;
      default:
        break;
    }
  }

  return Array.from(statsMap.values()).sort((left, right) => (
    right.goals - left.goals
    || right.assists - left.assists
    || left.redCards - right.redCards
    || left.yellowCards - right.yellowCards
    || (left.firstGoalOrder ?? Number.MAX_SAFE_INTEGER) - (right.firstGoalOrder ?? Number.MAX_SAFE_INTEGER)
    || left.playerName.localeCompare(right.playerName)
  ));
}

function getFeaturedPlayer(playerStats: PlayerEventStats[]) {
  return playerStats.find((player) => player.goals > 0 || player.assists > 0) ?? playerStats[0] ?? null;
}

function MatchEventRow({
  event,
  highlighted,
}: {
  event: MatchEventDetail;
  highlighted: boolean;
}) {
  const icon = getEventIcon(event.event_type);

  if (!icon) {
    return null;
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
        highlighted ? "bg-white/[0.06]" : "bg-transparent"
      }`}
    >
      <span className="w-6 text-center text-base leading-none">{icon}</span>
      <span className="min-w-[3rem] text-sm font-medium tabular-nums text-[--color-text-300]">{formatEventMoment(event)}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
        {event.player_name ?? "Evento geral"}
      </span>
    </li>
  );
}

function FeaturedPlayerSummary({ player }: { player: PlayerEventStats | null }) {
  if (!player) {
    return (
      <div className="border-t border-white/8 pt-4">
        <p className="text-sm text-[--color-text-400]">Sem destaque ainda.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-white/8 pt-4">
      <p className="text-lg font-semibold text-white">{player.playerName}</p>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-medium text-[--color-text-300]">
        <span>⚽ {player.goals}</span>
        <span>👟 {player.assists}</span>
        {player.yellowCards > 0 ? <span>🟨 {player.yellowCards}</span> : null}
        {player.redCards > 0 ? <span>🟥 {player.redCards}</span> : null}
      </div>
    </div>
  );
}

export function LiveMatchReport({
  events,
}: {
  events: MatchEventDetail[];
}) {
  const orderedEvents = useMemo(
    () => events.filter(shouldShowInTimeline).slice().reverse(),
    [events],
  );
  const playerStats = useMemo(() => aggregatePlayerStats(events), [events]);
  const featuredPlayer = useMemo(() => getFeaturedPlayer(playerStats), [playerStats]);
  const [freshEventId, setFreshEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!orderedEvents.length) {
      return;
    }
    setFreshEventId(orderedEvents[0].id);
    const timeout = window.setTimeout(() => setFreshEventId(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [orderedEvents]);

  return (
    <section className="page-card bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
      <div>
        <p className="eyebrow">Sumula da partida</p>
        <h3 className="mt-2 text-[clamp(1.35rem,1.7vw,1.8rem)] font-semibold leading-tight text-white">Timeline da partida</h3>
      </div>

      <div className="mt-5">
        {orderedEvents.length ? (
          <ul className="space-y-1">
            {orderedEvents.map((event) => (
              <MatchEventRow
                key={event.id}
                event={event}
                highlighted={freshEventId === event.id}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[--color-text-400]">Os eventos vao aparecer aqui assim que a partida comecar.</p>
        )}
      </div>

      <div className="mt-5">
        <FeaturedPlayerSummary player={featuredPlayer} />
      </div>
    </section>
  );
}
