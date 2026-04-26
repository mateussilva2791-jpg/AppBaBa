import type { LiveTeam, MatchEventDetail, MatchEventType, MatchItem } from "@/lib/types";


export const EVENT_LABELS: Record<MatchEventType, string> = {
  MATCH_STARTED: "Jogo iniciado",
  GOAL: "Gol",
  ASSIST: "Assistencia",
  FOUL: "Falta",
  YELLOW_CARD: "Cartao amarelo",
  RED_CARD: "Cartao vermelho",
  SUBSTITUTION: "Substituicao",
  HALF_TIME: "Intervalo",
  SECOND_HALF_STARTED: "Segundo tempo",
  MATCH_FINISHED: "Encerrado",
  OWN_GOAL: "Gol contra",
  CARD: "Cartao",
  CLEAN_SHEET: "Clean sheet",
};

export function getEventLabel(type: MatchEventType) {
  return EVENT_LABELS[type] ?? type;
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatEventMoment(event: Pick<MatchEventDetail, "minute" | "second">) {
  return `${event.minute}' ${String(event.second).padStart(2, "0")}s`;
}

export function describeEvent(event: MatchEventDetail) {
  const label = getEventLabel(event.event_type);
  const actor = event.player_name ? ` ${event.player_name}` : "";
  const related = event.related_player_name ? ` | ${event.related_player_name}` : "";
  const team = event.team_name ? ` | ${event.team_name}` : "";
  const notes = event.notes ? ` | ${event.notes}` : "";
  return `${label}${actor}${related}${team}${notes}`;
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Rascunho";
    case "READY":
      return "Pronta";
    case "IN_PROGRESS":
      return "Em andamento";
    case "LIVE":
      return "Ao vivo";
    case "HALF_TIME":
      return "Intervalo";
    case "FINISHED":
      return "Encerrado";
    case "NOT_STARTED":
    case "SCHEDULED":
      return "Nao iniciado";
    default:
      return status.replaceAll("_", " ");
  }
}

export function getMatchPeriodLabel(period: string) {
  switch (period) {
    case "FIRST_HALF":
      return "1o tempo";
    case "HALF_TIME":
      return "Intervalo";
    case "SECOND_HALF":
      return "2o tempo";
    case "FINISHED":
      return "Encerrado";
    case "NOT_STARTED":
    default:
      return "Nao iniciado";
  }
}

export function getPersistedMatchClockSeconds(match: Pick<MatchItem, "elapsed_seconds" | "is_clock_running" | "period_started_at">, nowMs = Date.now()) {
  const base = match.elapsed_seconds ?? 0;
  if (!match.is_clock_running || !match.period_started_at) {
    return base;
  }

  const startedAtMs = Date.parse(match.period_started_at);
  if (Number.isNaN(startedAtMs)) {
    return base;
  }

  return base + Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
}

export function getTeamById(teams: LiveTeam[], teamId: string | null) {
  return teams.find((team) => team.id === teamId) ?? null;
}

export function getTeamPlayers(teams: LiveTeam[], teamId: string | null) {
  return getTeamById(teams, teamId)?.players ?? [];
}
