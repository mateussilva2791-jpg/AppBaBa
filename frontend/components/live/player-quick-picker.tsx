import type { LiveTeamPlayer } from "@/lib/types";


function PlayerMiniStats({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[--color-text-300]">
      {label} {value}
    </span>
  );
}

export function PlayerQuickPicker({
  players,
  onSelect,
}: {
  players: LiveTeamPlayer[];
  onSelect: (playerId: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {players.map((player) => (
        <button
          key={player.player_id}
          type="button"
          className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/14 hover:bg-white/[0.06]"
          onClick={() => onSelect(player.player_id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{player.player_name}</p>
              <p className="mt-1 text-sm text-[--color-text-400]">{player.position ?? "Livre"}{player.is_captain ? " • capitao" : ""}</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/12 bg-cyan-400/10 px-3 py-2 text-right">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-cyan-100">Overall</span>
              <strong className="text-base text-white">{player.overall}</strong>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <PlayerMiniStats label="Ata" value={player.attack_rating} />
            <PlayerMiniStats label="Pas" value={player.passing_rating} />
            <PlayerMiniStats label="Def" value={player.defense_rating} />
            <PlayerMiniStats label="Fol" value={player.stamina_rating} />
          </div>
        </button>
      ))}
    </div>
  );
}
