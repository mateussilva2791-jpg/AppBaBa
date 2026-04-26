import { ArrowUpRight, ShieldCheck, Swords } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { getBalanceLabel, getBalanceTone, getSafeTeamStrength } from "@/lib/session";
import type { GeneratedTeam } from "@/lib/types";


function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[--color-text-400]">{label}</p>
      <strong className="mt-2 block text-white">{value}</strong>
    </div>
  );
}

export function TeamStrengthCard({
  team,
  strongestValue,
  editable = false,
  teamOptions = [],
  movingPlayerId,
  onMovePlayer,
}: {
  team: GeneratedTeam;
  strongestValue: number;
  editable?: boolean;
  teamOptions?: Array<{ id: string; name: string }>;
  movingPlayerId?: string;
  onMovePlayer?: (playerId: string, targetTeamId: string) => void;
}) {
  const strength = getSafeTeamStrength(team);
  const strengthWidth = strongestValue ? Math.max(18, (strength.total_strength / strongestValue) * 100) : 0;

  return (
    <article className="surface-elevated overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Time balanceado</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{team.name}</h3>
          <p className="mt-2 text-sm text-[--color-text-400]">Overall medio {strength.average_overall} com distribuicao forte nas quatro stats principais.</p>
        </div>
        <div className="space-y-2 text-right">
          <StatusBadge tone={getBalanceTone(team.balance_state)}>{getBalanceLabel(team.balance_state)}</StatusBadge>
          <div className="rounded-[22px] border border-emerald-300/12 bg-emerald-400/10 px-4 py-3">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-emerald-100">Forca total</span>
            <strong className="text-2xl text-white">{strength.total_strength}</strong>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3 rounded-[24px] border border-white/8 bg-black/15 p-4">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[--color-text-400]">
          <span className="inline-flex items-center gap-2"><Swords className="h-4 w-4" /> Pressao competitiva</span>
          <span className="text-white">{team.balance_delta} pts do eixo medio</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#38d39f)] shadow-[0_0_22px_rgba(34,211,238,0.25)]"
            style={{ width: `${strengthWidth}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatPill label="Ataque" value={strength.attack_total} />
        <StatPill label="Passe" value={strength.passing_total} />
        <StatPill label="Defesa" value={strength.defense_total} />
        <StatPill label="Folego" value={strength.stamina_total} />
      </div>

      <div className="mt-5 grid gap-3">
        {team.players.map((player) => (
          <div key={player.player_id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white">{player.player_name}</p>
                <p className="text-sm text-[--color-text-400]">{player.position ?? "Livre"} • nivel {player.skill_level}</p>
              </div>
              <div className="rounded-2xl bg-cyan-400/12 px-3 py-2 text-right">
                <span className="block text-[10px] uppercase tracking-[0.2em] text-cyan-100">Overall</span>
                <strong className="text-lg text-white">{player.overall}</strong>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[--color-text-300] md:grid-cols-4">
              <StatPill label="Ata" value={player.attack_rating} />
              <StatPill label="Pas" value={player.passing_rating} />
              <StatPill label="Def" value={player.defense_rating} />
              <StatPill label="Fol" value={player.stamina_rating} />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[--color-text-400]">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Peso no sorteio</span>
              <span className="inline-flex items-center gap-2 text-white"><ArrowUpRight className="h-4 w-4" /> {player.balance_score}</span>
            </div>
            {editable && teamOptions.length > 1 && onMovePlayer ? (
              <div className="mt-4 rounded-[20px] border border-white/8 bg-black/20 p-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[--color-text-400]">Mover atleta de time</label>
                <select
                  className="input-shell mt-2 w-full"
                  value={team.team_id}
                  disabled={movingPlayerId === player.player_id}
                  onChange={(event) => {
                    const nextTeamId = event.target.value;
                    if (nextTeamId && nextTeamId !== team.team_id) {
                      onMovePlayer(player.player_id, nextTeamId);
                    }
                  }}
                >
                  {teamOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}
