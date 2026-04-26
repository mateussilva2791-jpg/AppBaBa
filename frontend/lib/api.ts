const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "/api";

const API_TIMEOUT_MS = 8_000;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

type ApiOptions = {
  method?: ApiMethod;
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
};

type ApiErrorPayload = {
  detail?: string | { message?: string; code?: string };
  message?: string;
};

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "server"
  | "http";

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;
  url: string;

  constructor(message: string, status: number, kind: ApiErrorKind, url: string) {
    super(message);
    this.status = status;
    this.kind = kind;
    this.url = url;
  }
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function logApi(step: string, payload: Record<string, unknown>) {
  if (!isDevelopment()) {
    return;
  }

  console.info(`[api] ${step}`, payload);
}

function logApiError(step: string, payload: Record<string, unknown>) {
  if (!isDevelopment()) {
    return;
  }

  console.warn(`[api] ${step}`, payload);
}

function normalizeApiBaseUrl(rawUrl: string) {
  return rawUrl.replace(/\/$/, "");
}

function isRelativeApiBaseUrl(rawUrl: string) {
  return rawUrl.startsWith("/");
}

function resolveApiBaseUrl() {
  const fallbackUrl = normalizeApiBaseUrl(DEFAULT_API_BASE_URL);

  if (isRelativeApiBaseUrl(fallbackUrl)) {
    return fallbackUrl;
  }

  if (typeof window === "undefined") {
    return fallbackUrl;
  }

  try {
    const configuredUrl = new URL(fallbackUrl);
    const currentHostname = window.location.hostname;

    if (LOOPBACK_HOSTS.has(configuredUrl.hostname) && currentHostname && !LOOPBACK_HOSTS.has(currentHostname)) {
      configuredUrl.hostname = currentHostname;
    }

    return normalizeApiBaseUrl(configuredUrl.toString());
  } catch (error) {
    logApiError("base-url-invalid", {
      configured: fallbackUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackUrl;
  }
}

function resolveWebSocketBaseUrl(apiBaseUrl: string) {
  if (isRelativeApiBaseUrl(apiBaseUrl)) {
    if (typeof window === "undefined") {
      return apiBaseUrl.replace(/\/api$/, "");
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${apiBaseUrl.replace(/\/api$/, "")}`;
  }

  return apiBaseUrl.replace(/^http/, "ws").replace(/\/api$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();
export const WS_BASE_URL = resolveWebSocketBaseUrl(API_BASE_URL);

function extractErrorMessage(payload: ApiErrorPayload | null, status: number) {
  if (typeof payload?.detail === "string" && payload.detail) {
    return payload.detail;
  }

  // FastAPI 422 returns detail as an array of validation errors
  if (Array.isArray((payload as unknown as { detail: unknown[] })?.detail)) {
    const errs = (payload as unknown as { detail: Array<{ msg?: string }> }).detail;
    const messages = errs.map((e) => (e.msg ?? "").replace(/^Value error,\s*/i, "")).filter(Boolean).join("; ");
    if (messages) return messages;
  }

  if (payload?.detail && typeof payload.detail === "object" && payload.detail.message) {
    return payload.detail.message;
  }

  if (payload?.message) {
    return payload.message;
  }

  if (status === 401) {
    return "Sua sessao expirou ou e invalida. Entre novamente.";
  }

  if (status === 403) {
    return "Voce nao tem permissao para acessar este recurso.";
  }

  if (status === 404) {
    return "O recurso solicitado nao foi encontrado.";
  }

  if (status >= 500) {
    return "A API do Baba encontrou um erro interno ao processar a requisicao.";
  }

  return "A requisicao para a API falhou.";
}

function getErrorKind(status: number): ApiErrorKind {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 403) {
    return "forbidden";
  }
  if (status === 404) {
    return "not_found";
  }
  if (status >= 500) {
    return "server";
  }
  return "http";
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? API_TIMEOUT_MS);

  logApi("request", {
    method: options.method ?? "GET",
    url,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      logApiError("timeout", { method: options.method ?? "GET", url, timeoutMs: options.timeoutMs ?? API_TIMEOUT_MS });
      throw new ApiError(
        "A API do Baba demorou demais para responder. Confira se o backend esta online e se o banco terminou de subir.",
        0,
        "timeout",
        url,
      );
    }

    logApiError("network-failure", {
      method: options.method ?? "GET",
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ApiError(
      "Nao foi possivel conectar com a API do Baba. Verifique a URL configurada e se o backend esta rodando.",
      0,
      "network",
      url,
    );
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }

    const message = extractErrorMessage(payload, response.status);
    const kind = getErrorKind(response.status);

    logApiError("http-error", {
      method: options.method ?? "GET",
      url,
      status: response.status,
      payload,
    });

    throw new ApiError(message, response.status, kind, url);
  }

  logApi("response", {
    method: options.method ?? "GET",
    url,
    status: response.status,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
