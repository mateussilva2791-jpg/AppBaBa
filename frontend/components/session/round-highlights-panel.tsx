"use client";

import { Goal, Sparkles, Star, Target, Trophy } from "lucide-react";

import { PlayerAvatar } from "@/components/ui/player-avatar";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { SessionHighlights } from "@/lib/types";


function HighlightHero({
  tone,
  icon: Icon,
  label,
  player,
  helper,
}: {
  tone: "warning" | "info" | "success";
  icon: typeof Trophy;
  label: string;
  player: SessionHighlights["best_average_player"];
  helper: string;
}) {
  if (!player) {
    return (
      <div className="surface-soft p-5">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge tone={tone}>{label}</StatusBadge>
          <Icon className="h-5 w-5 text-[--color-text-400]" />
        </div>
        <p className="mt-5 text-lg font-semibold text-white">Sem definicao</p>
        <p className="mt-2 text-sm text-[--color-text-400]">Feche a rodada com eventos registrados para liberar este destaque.</p>
      </div>
    );
  }

  return (
    <div className="surface-soft p-5">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge tone={tone}>{label}</StatusBadge>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-white">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <PlayerAvatar name={player.player_name} accent={tone === "warning" ? "gold" : tone === "success" ? "mint" : "sky"} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{player.player_name}</p>
          <p className="text-sm text-[--color-text-400]">{helper}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[--color-text-400]">Media</p>
          <strong className="mt-2 block text-2xl text-white">{player.average_score}</strong>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[--color-text-400]">Gols</p>
          <strong className="mt-2 block text-2xl text-white">{player.goals}</strong>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[--color-text-400]">Assist</p>
          <strong className="mt-2 block text-2xl text-white">{player.assists}</strong>
        </div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[--color-text-400]">{player.matches_played} partidas na sessao • {player.wins} vitorias</p>
    </div>
  );
}


export function RoundHighlightsPanel({
  highlights,
  eyebrow = "Destaques da rodada",
  title = "Conquistas automaticas ao fechar a sessao",
  description = "Os eventos viram premios, selecao da rodada e leitura instantanea de impacto competitivo.",
}: {
  highlights: SessionHighlights;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className="page-card">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <HighlightHero tone="warning" icon={Trophy} label="Melhor media" player={highlights.best_average_player ?? highlights.best_player} helper="Maior media por partida da sessao" />
        <HighlightHero tone="info" icon={Goal} label="Artilheiro" player={highlights.top_scorer} helper="Desempate por assistencias, disciplina e media" />
        <HighlightHero tone="success" icon={Target} label="Maior assistente" player={highlights.top_assist_player} helper="Desempate por gols, disciplina e media" />
      </div>

      <div className="mt-6 rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_45%),rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Time da rodada</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Selecao de impacto da sessao</h3>
            <p className="mt-2 text-sm text-[--color-text-400]">Os melhores scores entram automaticamente nessa vitrine competitiva.</p>
          </div>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-400/14 text-cyan-100">
            <Sparkles className="h-6 w-6" />
          </span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {highlights.team_of_the_week?.players.length ? (
            highlights.team_of_the_week.players.map((player) => (
              <div key={player.id} className="surface-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <PlayerAvatar name={player.player_name} accent="mint" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{player.player_name}</p>
                      <p className="text-sm text-[--color-text-400]">{player.goals} gols • {player.assists} assistencias</p>
                    </div>
                  </div>
                  <StatusBadge tone="success">#{player.rank_position}</StatusBadge>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-[--color-text-300]">
                  <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-amber-200" /> score {player.score}</span>
                  <span>{player.player_nickname ?? "Rodada premium"}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="surface-soft p-5 text-sm text-[--color-text-400]">
              Sem selecao formada ainda.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
