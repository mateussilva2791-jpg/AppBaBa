"use client";

import { FieldPlayerNode } from "@/components/live/field-player-node";
import type { LiveTeam } from "@/lib/types";


type FieldPlayerStats = {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

const HOME_SLOTS = [
  { top: "86%", left: "50%" },
  { top: "74%", left: "20%" },
  { top: "74%", left: "50%" },
  { top: "74%", left: "80%" },
  { top: "61%", left: "12%" },
  { top: "61%", left: "32%" },
  { top: "61%", left: "68%" },
  { top: "61%", left: "88%" },
  { top: "47%", left: "30%" },
  { top: "47%", left: "70%" },
];

function mirrorSlot(slot: { top: string; left: string }) {
  return {
    top: `${100 - Number.parseFloat(slot.top)}%`,
    left: `${100 - Number.parseFloat(slot.left)}%`,
  };
}

function resolveSlots(count: number, side: "home" | "away") {
  const baseSlots = side === "home" ? HOME_SLOTS : HOME_SLOTS.map(mirrorSlot);
  if (count <= baseSlots.length) {
    return baseSlots.slice(0, count);
  }

  const extras = Array.from({ length: count - baseSlots.length }, (_, index) => ({
    top: side === "home" ? `${40 - index * 7}%` : `${60 + index * 7}%`,
    left: index % 2 === 0 ? "40%" : "60%",
  }));

  return [...baseSlots, ...extras];
}

export function FieldTeamLayer({
  team,
  side,
  disabled = false,
  highlightedPlayerId = null,
  focused = false,
  eventStats,
  onSelectPlayer,
}: {
  team: LiveTeam;
  side: "home" | "away";
  disabled?: boolean;
  highlightedPlayerId?: string | null;
  focused?: boolean;
  eventStats: Map<string, FieldPlayerStats>;
  onSelectPlayer: (playerId: string, teamId: string) => void;
}) {
  const slots = resolveSlots(team.players.length, side);

  return (
    <>
      <div
        className={`pointer-events-none absolute ${side === "home" ? "bottom-4 left-4" : "right-4 top-4"} rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${
          focused
            ? "border-cyan-200/25 bg-cyan-400/10 text-cyan-100"
            : "border-white/10 bg-black/20 text-[--color-text-300]"
        }`}
      >
        {side === "home" ? "Mandante" : "Visitante"} - {team.name}
      </div>

      {team.players.map((player, index) => {
        const slot = slots[index] ?? { top: "50%", left: "50%" };
        const stats = eventStats.get(player.player_id) ?? {
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        };

        return (
          <FieldPlayerNode
            key={player.player_id}
            player={player}
            jerseyNumber={index + 1}
            top={slot.top}
            left={slot.left}
            side={side}
            disabled={disabled}
            highlighted={highlightedPlayerId === player.player_id}
            focused={focused}
            eventStats={stats}
            onSelect={(playerId) => onSelectPlayer(playerId, team.id)}
          />
        );
      })}
    </>
  );
}
