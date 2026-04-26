"use client";

import { Award, Goal, Shield, Trophy, TrendingUp } from "lucide-react";

import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { SessionSummary } from "@/lib/types";


function PremiumMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  toneClass,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Trophy;
  toneClass: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)]">
      <div className={`absolute inset-x-0 top-0 h-1 ${toneClass}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[--color-text-400]">{label}</p>
          <strong className="mt-3 block text-2xl text-white">{value}</strong>
        </div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-[--color-text-300]">{helper}</p>
    </article>
  );
}


export function SessionFinalSummary({
  summary,
}: {
  summary: SessionSummary;
}) {
  const topScorer = summary.top_scorer;
  const bestPlayer = summary.best_player;
  const bestTeam = summary.best_team;
  const mostWinsTeam = summary.most_wins_team;

  return (
    <section className="page-card">
      <SectionHeader
        eyebrow="Sessao encerrada"
        title="Premiacao final consolidada"
        description="A rodada foi congelada com estatisticas finais, leitura de desempenho e vitrine oficial das conquistas do Baba."
        action={<StatusBadge tone="warning">Sessao encerrada</StatusBadge>}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        <PremiumMetricCard
          label="Total de gols"
          value={String(summary.total_goals)}
          helper="Consolidado automatico de toda a sessao, pronto para leitura rapida da rodada."
          icon={Goal}
          toneClass="bg-[linear-gradient(90deg,#22d3ee,#38bdf8)]"
        />
        <PremiumMetricCard
          label="Artilheiro do Baba"
          value={topScorer?.player_name ?? "Sem lider"}
          helper={topScorer ? `${topScorer.goals ?? 0} gols • ${topScorer.assists ?? 0} assistencias` : "Sem gols registrados na sessao encerrada."}
          icon={Trophy}
          toneClass="bg-[linear-gradient(90deg,#fbbf24,#f59e0b)]"
        />
        <PremiumMetricCard
          label="Melhor desempenho"
          value={bestPlayer?.player_name ?? "Sem destaque"}
          helper={bestPlayer ? `score ${bestPlayer.score ?? 0} • media ${bestPlayer.average_score ?? 0}` : "Nenhum score forte o suficiente para definir um MVP."}
          icon={Award}
          toneClass="bg-[linear-gradient(90deg,#34d399,#10b981)]"
        />
        <PremiumMetricCard
          label="Melhor time"
          value={bestTeam?.team_name ?? "Sem lider"}
          helper={bestTeam ? `${bestTeam.wins ?? 0} vitorias • saldo ${bestTeam.goal_difference ?? 0} • score ${bestTeam.score ?? 0}` : "Sem equipe dominante definida."}
          icon={Shield}
          toneClass="bg-[linear-gradient(90deg,#60a5fa,#2563eb)]"
        />
        <PremiumMetricCard
          label="Mais vitorias"
          value={mostWinsTeam?.team_name ?? "Sem lider"}
          helper={mostWinsTeam ? `${mostWinsTeam.wins ?? 0} vitorias • ${mostWinsTeam.points ?? 0} pontos` : "Nenhuma equipe com campanha consolidada ainda."}
          icon={TrendingUp}
          toneClass="bg-[linear-gradient(90deg,#f472b6,#ec4899)]"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_42%),rgba(255,255,255,0.03)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Top performers</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Ranking final da sessao</h3>
            </div>
            <StatusBadge tone="info">Top 5</StatusBadge>
          </div>
          <div className="mt-6 space-y-3">
            {summary.players.slice(0, 5).map((player) => (
              <div key={player.id} className="surface-soft flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{player.player_name}</p>
                  <p className="text-sm text-[--color-text-400]">{player.goals} gols • {player.assists} assistencias • {player.wins} vitorias</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[--color-text-400]">Score</p>
                  <strong className="mt-2 block text-xl text-white">{player.score}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_40%),rgba(255,255,255,0.03)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Quadro final</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Times da rodada</h3>
            </div>
            <StatusBadge tone="success">Tabela</StatusBadge>
          </div>
          <div className="mt-6 space-y-3">
            {summary.teams.map((team) => (
              <div key={team.id} className="surface-soft flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{team.team_name}</p>
                  <p className="text-sm text-[--color-text-400]">{team.wins}V • {team.draws}E • {team.losses}D • saldo {team.goal_difference}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[--color-text-400]">Score</p>
                  <strong className="mt-2 block text-xl text-white">{team.team_score}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
