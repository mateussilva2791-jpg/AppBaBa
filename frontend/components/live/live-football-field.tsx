"use client";

import { ShieldAlert } from "lucide-react";

import { FieldTeamLayer } from "@/components/live/field-team-layer";
import type { LiveTeam, MatchEventDetail, MatchEventType } from "@/lib/types";

export function LiveFootballField({
  teams,
  selectedTeamId,
  events,
  action,
  disabled = false,
  highlightedPlayerId = null,
  onSelectPlayer,
}: {
  teams: LiveTeam[];
  selectedTeamId: string | null;
  events: MatchEventDetail[];
  action: MatchEventType | null;
  disabled?: boolean;
  highlightedPlayerId?: string | null;
  onSelectPlayer: (playerId: string, teamId: string) => void;
}) {
  if (!teams.length) {
    return (
      <div className="page-card">
        <div className="empty-card flex min-h-[440px] flex-col items-center justify-center text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-white/6 text-[--color-text-300]">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <strong className="mt-4 text-xl text-white">Escolha um time para abrir o campo</strong>
          <p className="mt-2 max-w-md text-sm text-[--color-text-400]">
            O modulo visual acompanha a acao atual e deixa a selecao de jogador mais rapida, sem substituir os controles que ja existem na tela.
          </p>
        </div>
      </div>
    );
  }

  const eventStats = new Map<string, { goals: number; assists: number; yellowCards: number; redCards: number }>();
  for (const event of events.filter((item) => !item.is_reverted)) {
    if (!event.player_id && !event.related_player_id) {
      continue;
    }

    if (event.event_type === "GOAL" && event.player_id) {
      const current = eventStats.get(event.player_id) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
      current.goals += 1;
      eventStats.set(event.player_id, current);
    }

    if (event.event_type === "GOAL" && event.related_player_id) {
      const current = eventStats.get(event.related_player_id) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
      current.assists += 1;
      eventStats.set(event.related_player_id, current);
    }

    if (event.event_type === "ASSIST" && event.player_id) {
      const current = eventStats.get(event.player_id) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
      current.assists += 1;
      eventStats.set(event.player_id, current);
    }

    if (event.event_type === "YELLOW_CARD" && event.player_id) {
      const current = eventStats.get(event.player_id) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
      current.yellowCards += 1;
      eventStats.set(event.player_id, current);
    }

    if (event.event_type === "RED_CARD" && event.player_id) {
      const current = eventStats.get(event.player_id) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
      current.redCards += 1;
      eventStats.set(event.player_id, current);
    }
  }

  const [homeTeam, awayTeam] = teams;

  return (
    <div className="page-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Campo interativo</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Os dois times em leitura limpa e clicavel</h3>
          <p className="mt-2 text-sm text-[--color-text-400]">
            {action
              ? "Clique no jogador para registrar a acao atual. Os indicadores respondem em tempo real sem poluir o campo."
              : "Selecione uma acao para transformar o campo em um atalho visual de operacao sem perder os controles atuais."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {teams.map((team, index) => (
            <div key={team.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[--color-text-400]">{index === 0 ? "Mandante" : "Visitante"}</p>
              <strong className="mt-2 block text-lg text-white">{team.name}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[34px] border border-emerald-300/10 bg-[radial-gradient(circle_at_top,rgba(56,211,159,0.2),transparent_36%),linear-gradient(180deg,#0d2517,#0a1a12_28%,#08110d_100%)] p-4 sm:p-5">
        <div className="relative min-h-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,69,43,0.94),rgba(14,43,27,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="pointer-events-none absolute inset-0 opacity-90">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/20" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
            <div className="absolute left-1/2 top-0 h-[18%] w-[48%] -translate-x-1/2 border-x border-b border-white/18 rounded-b-[28px]" />
            <div className="absolute left-1/2 bottom-0 h-[18%] w-[48%] -translate-x-1/2 border-x border-t border-white/18 rounded-t-[28px]" />
            <div className="absolute left-1/2 top-[7%] h-20 w-20 -translate-x-1/2 rounded-full border border-white/14" />
            <div className="absolute left-1/2 bottom-[7%] h-20 w-20 -translate-x-1/2 rounded-full border border-white/14" />
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="absolute inset-x-0 h-px bg-white/8"
                style={{ top: `${12 + index * 11}%` }}
              />
            ))}
          </div>

          {homeTeam ? (
            <FieldTeamLayer
              team={homeTeam}
              side="home"
              disabled={disabled || !action}
              highlightedPlayerId={highlightedPlayerId}
              focused={selectedTeamId === homeTeam.id}
              eventStats={eventStats}
              onSelectPlayer={onSelectPlayer}
            />
          ) : null}
          {awayTeam ? (
            <FieldTeamLayer
              team={awayTeam}
              side="away"
              disabled={disabled || !action}
              highlightedPlayerId={highlightedPlayerId}
              focused={selectedTeamId === awayTeam.id}
              eventStats={eventStats}
              onSelectPlayer={onSelectPlayer}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
