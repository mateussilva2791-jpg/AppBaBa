export const AUTH_TOKEN_KEY = "baba_token";

// sessionStorage is scoped to the browser tab and cleared when the tab is closed,
// which is slightly safer than localStorage for JWT tokens on mobile browsers.
// The ideal solution is HttpOnly cookies set by the backend, but that requires
// a dedicated /auth/session endpoint and changes to the API client.
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  getStorage()?.setItem(AUTH_TOKEN_KEY, token);
}

export function getToken(): string | null {
  return getStorage()?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function clearToken() {
  getStorage()?.removeItem(AUTH_TOKEN_KEY);
}
