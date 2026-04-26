"use client";

import type { LiveTeam } from "@/lib/types";


export function TeamViewToggle({
  teams,
  selectedTeamId,
  onSelect,
}: {
  teams: LiveTeam[];
  selectedTeamId: string | null;
  onSelect: (teamId: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
      {teams.map((team) => {
        const selected = team.id === selectedTeamId;
        return (
          <button
            key={team.id}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              selected
                ? "bg-[linear-gradient(135deg,rgba(56,211,159,0.28),rgba(76,201,240,0.18))] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
                : "text-[--color-text-300] hover:text-white"
            }`}
            onClick={() => onSelect(team.id)}
          >
            {team.name}
          </button>
        );
      })}
    </div>
  );
}
