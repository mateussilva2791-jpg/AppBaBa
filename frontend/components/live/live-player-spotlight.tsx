"use client";

import { Activity, History, Shield } from "lucide-react";

import { getEventLabel, formatEventMoment } from "@/lib/live";
import type { LiveTeam, LiveTeamPlayer, MatchEventDetail } from "@/lib/types";


function getDisplayName(player: LiveTeamPlayer) {
  return player.player_nickname || player.player_name;
}

export function LivePlayerSpotlight({
  player,
  team,
  events,
}: {
  player: LiveTeamPlayer | null;
  team: LiveTeam | null;
  events: MatchEventDetail[];
}) {
  if (!player || !team) {
    return (
      <div className="surface-elevated p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-[--color-text-300]">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Jogador em foco</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Selecione um atleta no campo</h3>
            <p className="mt-2 text-sm text-[--color-text-400]">
              O campo fica limpo e clicavel. Os detalhes completos aparecem aqui sem poluir a visualizacao principal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const playerEvents = events
    .filter((event) => !event.is_reverted && (event.player_id === player.player_id || event.related_player_id === player.player_id))
    .slice()
    .reverse()
    .slice(0, 5);

  return (
    <div className="surface-elevated p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Jogador em foco</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{getDisplayName(player)}</h3>
          <p className="mt-2 text-sm text-[--color-text-400]">{team.name}</p>
        </div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
          <Activity className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[--color-text-400]">Posicao</p>
          <strong className="mt-2 block text-white">{player.position ?? "Sem posicao fixa"}</strong>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[--color-text-400]">Perfil</p>
          <strong className="mt-2 block text-white">
            Ata {player.attack_rating} · Pas {player.passing_rating} · Def {player.defense_rating}
          </strong>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[--color-text-300]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--color-text-400]">Historico da partida</p>
        </div>
        <div className="mt-3 space-y-2">
          {playerEvents.length ? playerEvents.map((event) => {
            const involvedAsAssist = event.related_player_id === player.player_id && event.event_type === "GOAL";
            return (
              <div key={event.id} className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-white">
                    {involvedAsAssist ? "Assistencia em gol" : getEventLabel(event.event_type)}
                  </strong>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[--color-text-400]">{formatEventMoment(event)}</span>
                </div>
                <p className="mt-1 text-sm text-[--color-text-400]">{event.notes ?? event.team_name ?? "Evento registrado ao vivo"}</p>
              </div>
            );
          }) : (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 px-3 py-3 text-sm text-[--color-text-400]">
              Nenhum evento registrado para este jogador nesta partida ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
