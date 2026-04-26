import { StatusBadge } from "@/components/ui/status-badge";
import type { LiveTeam } from "@/lib/types";


export function TeamSelector({
  teams,
  selectedTeamId,
  onSelect,
}: {
  teams: LiveTeam[];
  selectedTeamId: string | null;
  onSelect: (teamId: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {teams.map((team) => {
        const selected = team.id === selectedTeamId;
        return (
          <button
            key={team.id}
            type="button"
            className={`rounded-[24px] border p-4 text-left transition ${
              selected ? "border-cyan-300/28 bg-cyan-400/10" : "border-white/8 bg-white/[0.035] hover:bg-white/[0.05]"
            }`}
            onClick={() => onSelect(team.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{team.name}</p>
                <p className="mt-1 text-sm text-[--color-text-400]">{team.players.length} atletas acessiveis imediatamente</p>
              </div>
              <StatusBadge tone="info">OVR {team.average_overall}</StatusBadge>
            </div>
          </button>
        );
      })}
    </div>
  );
}
