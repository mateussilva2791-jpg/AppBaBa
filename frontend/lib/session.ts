import type { GeneratedTeam, LiveTeam, SessionBracketMatch, TeamComparison } from "@/lib/types";

const INITIAL_STAGE_MATCHES = new Set(["INITIAL_MATCH", "SEMIFINAL"]);


function defaultStrength() {
  return {
    total_strength: 0,
    average_overall: 0,
    attack_total: 0,
    passing_total: 0,
    defense_total: 0,
    stamina_total: 0,
  };
}

export function getSafeTeamStrength(team: GeneratedTeam) {
  return team.strength ?? defaultStrength();
}

export function getBalanceLabel(balanceState: string) {
  switch (balanceState) {
    case "BALANCED":
      return "Equilibrado";
    case "WARNING":
      return "Ajuste fino";
    case "UNBALANCED":
      return "Desequilibrado";
    default:
      return balanceState;
  }
}

export function getBalanceTone(balanceState: string) {
  switch (balanceState) {
    case "BALANCED":
      return "success";
    case "WARNING":
      return "warning";
    case "UNBALANCED":
      return "danger";
    default:
      return "info";
  }
}

export function getBracketStageLabel(stage: string) {
  switch (stage) {
    case "INITIAL_MATCH":
    case "SEMIFINAL":
      return "Fase inicial";
    case "WINNERS_MATCH":
      return "Jogo dos vencedores";
    case "ROTATION":
      return "Permanencia";
    case "SEMIFINAL":
      return "Semifinal";
    case "WINNERS_FINAL":
      return "Final dos vencedores";
    case "LOSERS_FINAL":
      return "Final dos perdedores";
    case "FINAL":
      return "Final";
    case "THIRD_PLACE":
      return "3o lugar";
    case "ROUND_ROBIN":
      return "Rodada";
    default:
      return stage.replaceAll("_", " ");
  }
}

export function getBracketMatchTitle(match: SessionBracketMatch | { stage: string; sequence: number; label: string | null }) {
  if (INITIAL_STAGE_MATCHES.has(match.stage)) {
    return match.sequence === 1 ? "Jogo 1" : match.sequence === 2 ? "Jogo 2" : match.label ?? `Jogo ${match.sequence}`;
  }
  if (match.stage === "WINNERS_MATCH") {
    return "Jogo 3";
  }
  if (match.stage === "ROTATION") {
    return match.label ?? "Quem ganhar fica";
  }
  return match.label ?? `Jogo ${match.sequence}`;
}

export function getTeamStrengthRange(teams: GeneratedTeam[]) {
  if (!teams.length) {
    return { min: 0, max: 0 };
  }
  const values = teams.map((team) => getSafeTeamStrength(team).total_strength);
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function getBracketColumns(matches: SessionBracketMatch[]) {
  const safeMatches = matches ?? [];
  const initial = safeMatches.filter((match) => INITIAL_STAGE_MATCHES.has(match.stage));
  const winners = safeMatches.filter((match) => match.stage === "WINNERS_MATCH");
  const rotation = safeMatches.filter((match) => match.stage === "ROTATION");
  const fallback = safeMatches.filter((match) => !initial.includes(match) && !winners.includes(match) && !rotation.includes(match));
  return { initial, winners, rotation, fallback };
}

export function getLiveTeamsForMatch(teams: LiveTeam[], match: { home_team_id: string | null; away_team_id: string | null }) {
  return teams.filter((team) => team.id === match.home_team_id || team.id === match.away_team_id);
}

export function getComparisonHeadline(comparison: TeamComparison | null, teams: GeneratedTeam[]) {
  if (!comparison || !teams.length) {
    return "As forcas dos times vao aparecer aqui assim que o sorteio for concluido.";
  }
  if (comparison.balance_state === "BALANCED") {
    return `Gap de ${comparison.strength_gap} pontos entre o mais forte e o mais leve. O sorteio ficou muito proximo.`;
  }
  if (comparison.balance_state === "WARNING") {
    return `Gap de ${comparison.strength_gap} pontos. Os times estao competitivos, mas ha espaco para ajuste manual.`;
  }
  return `Gap de ${comparison.strength_gap} pontos. Vale revisar a distribuicao antes de iniciar a rodada.`;
}
