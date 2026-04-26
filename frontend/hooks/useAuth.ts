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

const INITIAL_STATE: UseAuthState = {
  token: null,
  user: null,
  loading: true,
  error: null,
};

export function useAuth() {
  const pathname = usePathname();
  const [state, setState] = useState<UseAuthState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const token = getToken();
      if (!token) {
        if (active) {
          setState({ token: null, user: null, loading: false, error: null });
        }
        return;
      }

      try {
        const user = await apiRequest<AuthenticatedUser>("/auth/me", { token });
        if (active) {
          setState({ token, user, loading: false, error: null });
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearToken();
        }
        if (!active) {
          return;
        }

        const message =
          error instanceof ApiError && error.status === 401
            ? "Sua sessao expirou. Entre novamente."
            : error instanceof Error
              ? error.message
              : "Nao foi possivel validar sua autenticacao.";

        setState({ token: null, user: null, loading: false, error: message });
      }
    }

    setState((current) => ({ ...current, loading: true }));
    void loadUser();

    return () => {
      active = false;
    };
  }, [pathname]);

  return state;
}
