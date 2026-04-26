"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import type { League } from "@/lib/types";
import { getActiveLeagueForUser } from "@/services/leagues/getActiveLeagueForUser";


type UseActiveLeagueOptions = {
  requestedLeagueSlug?: string | null;
  enabled?: boolean;
};

type UseActiveLeagueState = {
  league: League | null;
  leagues: League[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
};

const INITIAL_STATE: UseActiveLeagueState = {
  league: null,
  leagues: [],
  loading: true,
  error: null,
  isEmpty: false,
};

export function useActiveLeague(options: UseActiveLeagueOptions = {}) {
  const { requestedLeagueSlug = null, enabled = true } = options;
  const auth = useAuth();
  const [state, setState] = useState<UseActiveLeagueState>(INITIAL_STATE);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadLeague() {
      if (!enabled) {
        if (active) {
          setState({ league: null, leagues: [], loading: false, error: null, isEmpty: false });
        }
        return;
      }

      if (auth.loading) {
        if (active) {
          setState((current) => ({ ...current, loading: true }));
        }
        return;
      }

      if (!auth.user || !auth.token) {
        if (active) {
          setState({
            league: null,
            leagues: [],
            loading: false,
            error: auth.error ?? "Usuario nao autenticado.",
            isEmpty: false,
          });
        }
        return;
      }

      try {
        const resolved = await getActiveLeagueForUser({
          token: auth.token,
          requestedLeagueSlug,
        });
        

        if (active) {
          setState({
            league: resolved.league,
            leagues: resolved.availableLeagues,
            loading: false,
            error: null,
            isEmpty: !resolved.availableLeagues.length || !resolved.league,
          });
        }
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("[active-league] resolution-failed", {
          requestedLeagueSlug,
          message: error instanceof Error ? error.message : String(error),
        });

        setState({
          league: null,
          leagues: [],
          loading: false,
          error: error instanceof Error ? error.message : "Nao foi possivel carregar a liga.",
          isEmpty: false,
        });
      }
    }

    void loadLeague();

    return () => {
      active = false;
    };
  }, [auth.error, auth.loading, auth.token, auth.user, enabled, reloadKey, requestedLeagueSlug]);

  return {
    league: state.league,
    leagues: state.leagues,
    loading: auth.loading || state.loading,
    error: state.error,
    isEmpty: state.isEmpty,
    refetch: () => setReloadKey((current) => current + 1),
    auth,
  };
}
