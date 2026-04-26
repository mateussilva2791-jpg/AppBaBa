import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { getBracketColumns, getBracketMatchTitle, getBracketStageLabel } from "@/lib/session";
import { getStatusTone } from "@/lib/ui";
import type { SessionBracket, SessionBracketMatch } from "@/lib/types";


function BracketMatchCard({
  match,
  leagueSlug,
  highlighted = false,
}: {
  match: SessionBracketMatch;
  leagueSlug: string;
  highlighted?: boolean;
}) {
  return (
    <article className={`rounded-[24px] border p-4 ${highlighted ? "border-emerald-300/30 bg-emerald-400/8" : "border-white/8 bg-white/[0.03]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{getBracketStageLabel(match.stage)}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{getBracketMatchTitle(match)}</h3>
        </div>
        <StatusBadge tone={getStatusTone(match.status)}>{match.status}</StatusBadge>
      </div>
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl bg-black/20 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white">{match.home_slot_label ?? "A definir"}</span>
            <strong className="text-xl text-white">{match.home_team_id ? match.home_score : "-"}</strong>
          </div>
        </div>
        <div className="rounded-2xl bg-black/20 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white">{match.away_slot_label ?? "A definir"}</span>
            <strong className="text-xl text-white">{match.away_team_id ? match.away_score : "-"}</strong>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[--color-text-400]">
        <span>{match.stage === "ROTATION" ? "Quem ganhar fica" : match.stage === "WINNERS_MATCH" ? "Jogo 3" : "Primeiros confrontos"}</span>
        {match.home_team_id && match.away_team_id ? (
          <Link href={`/league/${leagueSlug}/match/live/${match.id}`} className="inline-flex items-center gap-2 text-white">
            Operar
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <span>aguardando definicao</span>
        )}
      </div>
    </article>
  );
}

export function SessionBracketView({
  bracket,
  leagueSlug,
}: {
  bracket: SessionBracket;
  leagueSlug: string;
}) {
  const columns = getBracketColumns(bracket.matches);
  const queue = bracket.queue ?? [];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="surface-elevated p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Fluxo da rodada</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Inicial + permanencia automatica</h3>
            <p className="mt-2 text-sm text-[--color-text-400]">Primeiro saem os jogos 1 e 2, depois o duelo entre vencedores e so entao a fila rotativa entra em cena.</p>
          </div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
            <Trophy className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Fase 1</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {columns.initial.map((match) => (
                <BracketMatchCard key={match.id} match={match} leagueSlug={leagueSlug} highlighted={bracket.current_match_id === match.id} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Jogo 3</p>
            <div className="mt-3 grid gap-4">
              {columns.winners.length ? (
                columns.winners.map((match) => (
                  <BracketMatchCard key={match.id} match={match} leagueSlug={leagueSlug} highlighted={bracket.current_match_id === match.id} />
                ))
              ) : (
                <div className="empty-card">
                  <strong className="text-base text-white">Aguardando Jogo 1 e Jogo 2.</strong>
                  <p className="mt-2 text-sm text-[--color-text-400]">Assim que os dois confrontos iniciais forem encerrados, o Jogo 3 nasce automaticamente.</p>
                </div>
              )}
            </div>
          </div>
          {columns.fallback.length ? (
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Outros confrontos</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {columns.fallback.map((match) => (
                  <BracketMatchCard key={match.id} match={match} leagueSlug={leagueSlug} highlighted={bracket.current_match_id === match.id} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="surface-elevated p-5">
        <p className="eyebrow">Permanencia</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Quem ganha fica</h3>
        <p className="mt-2 text-sm text-[--color-text-400]">Depois do Jogo 3, o vencedor continua em quadra e o proximo time da fila entra para desafiar.</p>
        <div className="mt-5 grid gap-3">
          <div className="surface-soft p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Fase atual</p>
            <strong className="mt-2 block text-lg text-white">{bracket.flow_phase === "ROTATION_STAGE" ? "Rotacao ativa" : "Fase inicial"}</strong>
          </div>
          <div className="surface-soft p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Time na quadra</p>
            <strong className="mt-2 block text-lg text-white">{bracket.current_staying_team_name ?? "A definir"}</strong>
          </div>
          <div className="surface-soft p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Proximo desafiante</p>
            <strong className="mt-2 block text-lg text-white">{bracket.challenger_team_name ?? "Aguardando fila"}</strong>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {columns.rotation.length ? (
            columns.rotation.map((match) => (
              <BracketMatchCard key={match.id} match={match} leagueSlug={leagueSlug} highlighted={bracket.current_match_id === match.id} />
            ))
          ) : (
            <div className="empty-card">
              <strong className="text-base text-white">Rotacao ainda nao iniciada.</strong>
              <p className="mt-2 text-sm text-[--color-text-400]">Feche o Jogo 3 para ativar automaticamente a regra de permanencia.</p>
            </div>
          )}
        </div>
        <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Fila de desafiantes</p>
          <div className="mt-4 space-y-3">
            {queue.length ? (
              queue.map((team) => (
                <div key={team.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-3">
                  <span className="font-medium text-white">{team.name}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">#{team.queue_order}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[--color-text-400]">Nenhum time em espera no momento.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
