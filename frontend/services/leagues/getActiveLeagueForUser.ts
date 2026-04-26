import { apiRequest } from "@/lib/api";
import type { ActiveLeagueResolution, League } from "@/lib/types";


const ACTIVE_LEAGUE_STORAGE_KEY = "baba_active_league_id";

export type ActiveLeagueErrorCode =
  | "AUTH_REQUIRED"
  | "LEAGUE_NOT_FOUND";

export class ActiveLeagueError extends Error {
  code: ActiveLeagueErrorCode;

  constructor(code: ActiveLeagueErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type ActiveLeagueOptions = {
  token: string | null;
  requestedLeagueSlug?: string | null;
};

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function logActiveLeague(step: string, payload: unknown) {
  if (!isDevelopment()) {
    return;
  }

  console.info(`[active-league] ${step}`, payload);
}

export function getStoredActiveLeagueId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_LEAGUE_STORAGE_KEY);
}

export function saveActiveLeagueId(leagueId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVE_LEAGUE_STORAGE_KEY, leagueId);
}

export function clearActiveLeagueId() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_LEAGUE_STORAGE_KEY);
}

function sortLeagues(leagues: League[]) {
  return [...leagues].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

export async function getActiveLeagueForUser(
  { token, requestedLeagueSlug }: ActiveLeagueOptions,
) {
  if (!token) {
    throw new ActiveLeagueError("AUTH_REQUIRED", "Sessao invalida. Entre novamente.");
  }

  const preferredLeagueId = getStoredActiveLeagueId();
  const searchParams = preferredLeagueId ? `?preferred_league_id=${preferredLeagueId}` : "";
  const resolution = await apiRequest<ActiveLeagueResolution>(`/leagues/active${searchParams}`, { token });
  const availableLeagues = sortLeagues(resolution.available_leagues);

  logActiveLeague("memberships-found", {
    total: availableLeagues.length,
    leagueIds: availableLeagues.map((league) => league.id),
  });

  if (!availableLeagues.length) {
    clearActiveLeagueId();
    logActiveLeague("fallback-reason", resolution.fallback_reason ?? "no_memberships");
    return {
      league: null,
      availableLeagues: [],
      fallbackReason: resolution.fallback_reason ?? "no_memberships",
    };
  }

  const requestedLeague =
    requestedLeagueSlug ? availableLeagues.find((league) => league.slug === requestedLeagueSlug) ?? null : null;
  const resolvedLeague = requestedLeague ?? resolution.league ?? availableLeagues[0] ?? null;

  if (!resolvedLeague) {
    clearActiveLeagueId();
    throw new ActiveLeagueError("LEAGUE_NOT_FOUND", "Liga nao encontrada para este usuario.");
  }

  if (requestedLeagueSlug && !requestedLeague) {
    logActiveLeague("fallback-reason", `requested_slug_not_member:${requestedLeagueSlug}`);
  } else if (resolution.fallback_reason) {
    logActiveLeague("fallback-reason", resolution.fallback_reason);
  }

  saveActiveLeagueId(resolvedLeague.id);
  logActiveLeague("league-resolved", {
    leagueId: resolvedLeague.id,
    slug: resolvedLeague.slug,
    source: requestedLeague ? "requested-slug" : preferredLeagueId ? "stored-preference" : "default-first",
  });

  return {
    league: resolvedLeague,
    availableLeagues,
    fallbackReason: resolution.fallback_reason,
  };
}
