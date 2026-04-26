import {
  AlertTriangle,
  BadgeAlert,
  Flag,
  Hand,
  PlayCircle,
  RectangleEllipsis,
  Square,
  Target,
  TimerReset,
} from "lucide-react";

import { PlayerQuickPicker } from "@/components/live/player-quick-picker";
import { QuickEventButton } from "@/components/live/quick-event-button";
import { TeamSelector } from "@/components/live/team-selector";
import { StatusBadge } from "@/components/ui/status-badge";
import { getEventLabel } from "@/lib/live";
import { getLiveTeamsForMatch } from "@/lib/session";
import type { LiveTeam, MatchEventDetail, MatchEventType, MatchItem } from "@/lib/types";


const QUICK_ACTIONS: Array<{
  type: MatchEventType;
  label: string;
  hint: string;
  accentClass: string;
  glyph: string;
  icon: typeof Target;
}> = [
  { type: "GOAL", label: "Gol", hint: "Bola na rede em 3 toques", accentClass: "bg-[linear-gradient(135deg,#1fe0a0,#138a7f)]", glyph: "⚽", icon: Target },
  { type: "ASSIST", label: "Assistencia", hint: "Passe decisivo com leitura imediata", accentClass: "bg-[linear-gradient(135deg,#42d5ff,#1d7dff)]", glyph: "👟", icon: Hand },
  { type: "FOUL", label: "Falta", hint: "Interrupcao rapida da jogada", accentClass: "bg-[linear-gradient(135deg,#94a3b8,#475569)]", glyph: "✕", icon: AlertTriangle },
  { type: "YELLOW_CARD", label: "Amarelo", hint: "Advertencia em ate tres toques", accentClass: "bg-[linear-gradient(135deg,#ffd460,#d18a0e)]", glyph: "🟨", icon: RectangleEllipsis },
  { type: "RED_CARD", label: "Vermelho", hint: "Expulsao com retorno instantaneo", accentClass: "bg-[linear-gradient(135deg,#ff6d7f,#c3324b)]", glyph: "🟥", icon: BadgeAlert },
];

const STATUS_ACTIONS: Array<{
  type: MatchEventType;
  label: string;
  accentClass: string;
  glyph: string;
  icon: typeof Target;
}> = [
  { type: "MATCH_STARTED", label: "Iniciar", accentClass: "bg-[linear-gradient(135deg,#16d38f,#1f7d68)]", glyph: "1", icon: PlayCircle },
  { type: "HALF_TIME", label: "Intervalo", accentClass: "bg-[linear-gradient(135deg,#aab6c4,#54606c)]", glyph: "//", icon: Flag },
  { type: "SECOND_HALF_STARTED", label: "2o tempo", accentClass: "bg-[linear-gradient(135deg,#43d1ff,#1789ff)]", glyph: "2", icon: TimerReset },
  { type: "MATCH_FINISHED", label: "Encerrar", accentClass: "bg-[linear-gradient(135deg,#ff6d7f,#b72f48)]", glyph: "90", icon: Square },
];

const STATUS_ACTIONS_BY_MATCH_STATUS: Record<string, MatchEventType[]> = {
  SCHEDULED: ["MATCH_STARTED"],
  NOT_STARTED: ["MATCH_STARTED"],
  LIVE: ["HALF_TIME", "MATCH_FINISHED"],
  HALF_TIME: ["SECOND_HALF_STARTED", "MATCH_FINISHED"],
  FINISHED: [],
};

const STATUS_ACTION_SEQUENCE: MatchEventType[] = [
  "MATCH_STARTED",
  "HALF_TIME",
  "SECOND_HALF_STARTED",
  "MATCH_FINISHED",
];

export function LiveActionPanel({
  teams,
  match,
  events,
  activeAction,
  selectedTeamId,
  disabled = false,
  showFlowSteps = true,
  onPickAction,
  onPickTeam,
  onPickPlayer,
}: {
  teams: LiveTeam[];
  match: MatchItem;
  events: MatchEventDetail[];
  activeAction: MatchEventType | null;
  selectedTeamId: string | null;
  disabled?: boolean;
  showFlowSteps?: boolean;
  onPickAction: (action: MatchEventType) => void;
  onPickTeam: (teamId: string) => void;
  onPickPlayer: (playerId: string) => void;
}) {
  const matchTeams = getLiveTeamsForMatch(teams, match);
  const selectedTeam = matchTeams.find((team) => team.id === selectedTeamId) ?? null;
  const completedStatusActions = new Set(
    events.filter((event) => !event.is_reverted).map((event) => event.event_type).filter((type) => STATUS_ACTION_SEQUENCE.includes(type)),
  );

  let availableStatusActions = STATUS_ACTIONS_BY_MATCH_STATUS[match.status] ?? [];
  if (completedStatusActions.has("MATCH_FINISHED")) {
    availableStatusActions = [];
  } else if (completedStatusActions.has("SECOND_HALF_STARTED")) {
    availableStatusActions = ["MATCH_FINISHED"];
  } else if (completedStatusActions.has("HALF_TIME")) {
    availableStatusActions = ["SECOND_HALF_STARTED", "MATCH_FINISHED"];
  } else if (completedStatusActions.has("MATCH_STARTED")) {
    availableStatusActions = ["HALF_TIME", "MATCH_FINISHED"];
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/8 bg-black/15 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Acoes rapidas</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Operacao em ate 3 cliques</h3>
            <p className="mt-2 text-sm text-[--color-text-400]">Escolha a funcao, o time e o jogador. O registro e disparado imediatamente, tanto pela lista quanto pelo novo campo visual.</p>
          </div>
          <StatusBadge tone={activeAction ? "info" : "neutral"}>{activeAction ? getEventLabel(activeAction) : "Aguardando acao"}</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <QuickEventButton
              key={action.type}
              label={action.label}
              hint={action.hint}
              icon={action.icon}
              accentClass={action.accentClass}
              glyph={action.glyph}
              active={activeAction === action.type}
              disabled={disabled}
              onClick={() => onPickAction(action.type)}
            />
          ))}
        </div>
      </div>

      {showFlowSteps ? (
        <LiveActionFlowSteps
          teams={teams}
          match={match}
          events={events}
          activeAction={activeAction}
          selectedTeamId={selectedTeamId}
          disabled={disabled}
          onPickAction={onPickAction}
          onPickTeam={onPickTeam}
          onPickPlayer={onPickPlayer}
        />
      ) : null}
    </div>
  );
}

export function LiveActionFlowSteps({
  teams,
  match,
  events,
  activeAction,
  selectedTeamId,
  disabled = false,
  onPickAction,
  onPickTeam,
  onPickPlayer,
}: {
  teams: LiveTeam[];
  match: MatchItem;
  events: MatchEventDetail[];
  activeAction: MatchEventType | null;
  selectedTeamId: string | null;
  disabled?: boolean;
  onPickAction: (action: MatchEventType) => void;
  onPickTeam: (teamId: string) => void;
  onPickPlayer: (playerId: string) => void;
}) {
  const matchTeams = getLiveTeamsForMatch(teams, match);
  const selectedTeam = matchTeams.find((team) => team.id === selectedTeamId) ?? null;
  const completedStatusActions = new Set(
    events.filter((event) => !event.is_reverted).map((event) => event.event_type).filter((type) => STATUS_ACTION_SEQUENCE.includes(type)),
  );

  let availableStatusActions = STATUS_ACTIONS_BY_MATCH_STATUS[match.status] ?? [];
  if (completedStatusActions.has("MATCH_FINISHED")) {
    availableStatusActions = [];
  } else if (completedStatusActions.has("SECOND_HALF_STARTED")) {
    availableStatusActions = ["MATCH_FINISHED"];
  } else if (completedStatusActions.has("HALF_TIME")) {
    availableStatusActions = ["SECOND_HALF_STARTED", "MATCH_FINISHED"];
  } else if (completedStatusActions.has("MATCH_STARTED")) {
    availableStatusActions = ["HALF_TIME", "MATCH_FINISHED"];
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
        <p className="eyebrow">Passo 2</p>
        <h4 className="mt-2 text-xl font-semibold text-white">Escolha o time</h4>
        <p className="mt-2 text-sm text-[--color-text-400]">Os dois elencos da partida ficam sempre visiveis para acelerar a cabine.</p>
        <div className="mt-5">
          <TeamSelector teams={matchTeams} selectedTeamId={selectedTeamId} onSelect={onPickTeam} />
        </div>

        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[--color-text-400]">Controles de partida</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {STATUS_ACTIONS.map((action) => (
              (() => {
                const enabled = availableStatusActions.includes(action.type);
                const completed = completedStatusActions.has(action.type);
                const currentStepIndex = STATUS_ACTION_SEQUENCE.findIndex((statusAction) => availableStatusActions.includes(statusAction));
                const actionIndex = STATUS_ACTION_SEQUENCE.indexOf(action.type);
                const statusLabel = completed ? "Feito" : enabled ? "Disponivel" : actionIndex > currentStepIndex ? "Depois" : "Aguarda";
                return (
                  <QuickEventButton
                    key={action.type}
                    label={action.label}
                    hint={
                      completed
                        ? "Etapa ja registrada nesta partida"
                        : enabled
                          ? "Controle de status e cronologia"
                          : "Aguarda a proxima etapa da partida"
                    }
                    icon={action.icon}
                    accentClass={action.accentClass}
                    glyph={action.glyph}
                    active={false}
                    disabled={disabled || !enabled}
                    emphasize={enabled}
                    statusLabel={statusLabel}
                    onClick={() => onPickAction(action.type)}
                  />
                );
              })()
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
        <p className="eyebrow">Passo 3</p>
        <h4 className="mt-2 text-xl font-semibold text-white">Toque no jogador</h4>
        <p className="mt-2 text-sm text-[--color-text-400]">
          {selectedTeam
            ? `Atletas do ${selectedTeam.name} prontos para registrar ${activeAction ? getEventLabel(activeAction).toLowerCase() : "o evento"}.`
            : "Escolha primeiro a acao e o time para abrir o painel de jogadores ou o campo interativo."}
        </p>
        <div className="mt-5">
          {selectedTeam ? (
            <PlayerQuickPicker players={selectedTeam.players} onSelect={onPickPlayer} />
          ) : (
            <div className="empty-card">
              <strong className="text-base text-white">Fluxo aguardando contexto.</strong>
              <p className="mt-2 text-sm text-[--color-text-400]">Selecione uma acao e um time para destravar a ultima etapa.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
