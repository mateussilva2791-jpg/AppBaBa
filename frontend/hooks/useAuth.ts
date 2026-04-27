"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, apiRequest } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { AuthenticatedUser } from "@/lib/types";


type UseAuthState = {
  token: string | null;
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
};

// Module-level cache: avoids re-calling /auth/me on every route change.
// Cleared when the token changes or on 401.
let _cachedToken: string | null = null;
let _cachedUser: AuthenticatedUser | null = null;

function getInitialState(): UseAuthState {
  const token = getToken();
  if (!token) {
    return { token: null, user: null, loading: false, error: null };
  }
  if (_cachedToken === token && _cachedUser) {
    return { token, user: _cachedUser, loading: false, error: null };
  }
  return { token: null, user: null, loading: true, error: null };
}

export function useAuth() {
  const pathname = usePathname();
  const [state, setState] = useState<UseAuthState>(getInitialState);

  useEffect(() => {
    let active = true;
    const token = getToken();

    // No token — immediately unauthenticated, no API call needed.
    if (!token) {
      setState({ token: null, user: null, loading: false, error: null });
      return;
    }

    // Cache hit — same token we already validated, skip the API call.
    if (_cachedToken === token && _cachedUser) {
      setState({ token, user: _cachedUser, loading: false, error: null });
      return;
    }

    // Cache miss — need to validate the token with the backend.
    setState((s) => ({ ...s, loading: true }));

    async function loadUser() {
      try {
        const user = await apiRequest<AuthenticatedUser>("/auth/me", { token: token! });
        _cachedToken = token;
        _cachedUser = user;
        if (active) setState({ token: token!, user, loading: false, error: null });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearToken();
          _cachedToken = null;
          _cachedUser = null;
        }
        if (!active) return;
        const message =
          error instanceof ApiError && error.status === 401
            ? "Sua sessao expirou. Entre novamente."
            : error instanceof Error
              ? error.message
              : "Nao foi possivel validar sua autenticacao.";
        setState({ token: null, user: null, loading: false, error: message });
      }
    }

    void loadUser();
    return () => { active = false; };
  }, [pathname]);

  return state;
}

/** Call this on logout so the cache is invalidated. */
export function invalidateAuthCache() {
  _cachedToken = null;
  _cachedUser = null;
}
