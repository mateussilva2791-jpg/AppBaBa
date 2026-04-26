"use client";

import { PlayerEventIndicators } from "@/components/live/player-event-indicators";
import type { LiveTeamPlayer } from "@/lib/types";


function getDisplayName(player: LiveTeamPlayer) {
  return player.player_nickname || player.player_name.split(" ")[0] || player.player_name;
}

export function FieldPlayerNode({
  player,
  jerseyNumber,
  top,
  left,
  side,
  disabled = false,
  highlighted = false,
  focused = false,
  eventStats,
  onSelect,
}: {
  player: LiveTeamPlayer;
  jerseyNumber: number;
  top: string;
  left: string;
  side: "home" | "away";
  disabled?: boolean;
  highlighted?: boolean;
  focused?: boolean;
  eventStats: {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };
  onSelect: (playerId: string) => void;
}) {
  const sideTone =
    side === "home"
      ? "border-emerald-300/24 bg-[linear-gradient(180deg,rgba(18,38,29,0.98),rgba(7,12,16,0.98))]"
      : "border-sky-300/24 bg-[linear-gradient(180deg,rgba(12,28,40,0.98),rgba(7,12,16,0.98))]";

  return (
    <button
      type="button"
      className={`absolute -translate-x-1/2 -translate-y-1/2 transition ${
        disabled ? "cursor-not-allowed opacity-65" : "hover:scale-[1.04]"
      } ${highlighted ? "animate-pulse" : ""} ${focused ? "z-20" : "z-10"}`}
      style={{ top, left }}
      disabled={disabled}
      onClick={() => onSelect(player.player_id)}
    >
      <span
        className={`relative flex min-w-[84px] flex-col items-center rounded-[20px] border px-2.5 py-2 text-center shadow-[0_14px_24px_rgba(0,0,0,0.24)] ${
          highlighted
            ? "border-cyan-200/60 bg-[linear-gradient(180deg,rgba(56,211,159,0.24),rgba(10,18,24,0.98))] shadow-[0_0_0_3px_rgba(34,211,238,0.12),0_16px_30px_rgba(0,0,0,0.3)]"
            : focused
              ? "border-cyan-300/32 bg-[linear-gradient(180deg,rgba(20,29,36,0.98),rgba(8,12,18,0.98))]"
              : sideTone
        }`}
      >
        <span className={`absolute -left-1.5 -top-1.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1 text-[11px] font-extrabold ${
          side === "home"
            ? "border-emerald-200/25 bg-emerald-300/14 text-emerald-100"
            : "border-sky-200/25 bg-sky-300/14 text-sky-100"
        }`}>
          {jerseyNumber}
        </span>
        <strong className="mt-1 text-[11px] font-semibold leading-tight text-white">{getDisplayName(player)}</strong>
        <PlayerEventIndicators
          goals={eventStats.goals}
          assists={eventStats.assists}
          yellowCards={eventStats.yellowCards}
          redCards={eventStats.redCards}
        />
      </span>
    </button>
  );
}
