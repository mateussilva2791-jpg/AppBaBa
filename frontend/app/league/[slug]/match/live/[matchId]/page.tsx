"use client";

import { Timer, X, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { EventFeed } from "@/components/live/event-feed";
import { MiniField } from "@/components/live/mini-field";
import { QuickConfirmationToast } from "@/components/live/quick-confirmation-toast";
import { apiRequest, WS_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  formatClock,
  getEventLabel,
  getMatchPeriodLabel,
  getPersistedMatchClockSeconds,
  getStatusLabel,
} from "@/lib/live";
import { getLeagueBySlug } from "@/lib/league";
import { getLiveTeamsForMatch } from "@/lib/session";
import { getStatusTone } from "@/lib/ui";
import type {
  League,
  LiveSocketEnvelope,
  MatchEventDetail,
  MatchEventType,
  MatchLiveState,
} from "@/lib/types";


const FLOW_EVENTS = new Set<MatchEventType>(["GOAL", "ASSIST", "FOUL", "YELLOW_CARD", "RED_CARD"]);

const MATCH_STATUS_BY_ACTION: Partial<Record<MatchEventType, string>> = {
  MATCH_STARTED: "LIVE",
  HALF_TIME: "HALF_TIME",
  SECOND_HALF_STARTED: "LIVE",
  MATCH_FINISHED: "FINISHED",
};

type EventAction = { type: MatchEventType; label: string; emoji: string; bg: string; activeBg: string; activeBorder: string };
const EVENT_ACTIONS: EventAction[] = [
  { type: "GOAL",        label: "Gol",      emoji: "⚽", bg: "rgba(52,211,153,0.06)",  activeBg: "rgba(52,211,153,0.14)",  activeBorder: "rgba(52,211,153,0.4)" },
  { type: "ASSIST",      label: "Assist.",  emoji: "👟", bg: "rgba(96,165,250,0.06)",  activeBg: "rgba(96,165,250,0.14)",  activeBorder: "rgba(96,165,250,0.4)" },
  { type: "FOUL",        label: "Falta",    emoji: "🤚", bg: "rgba(148,163,184,0.06)", activeBg: "rgba(148,163,184,0.14)", activeBorder: "rgba(148,163,184,0.35)" },
  { type: "YELLOW_CARD", label: "Amarelo",  emoji: "🟨", bg: "rgba(250,204,21,0.06)",  activeBg: "rgba(250,204,21,0.14)",  activeBorder: "rgba(250,204,21,0.45)" },
  { type: "RED_CARD",    label: "Vermelho", emoji: "🟥", bg: "rgba(248,113,113,0.06)", activeBg: "rgba(248,113,113,0.14)", activeBorder: "rgba(248,113,113,0.4)" },
];

type StatusAction = { type: MatchEventType; label: string; color: string };
const STATUS_ACTIONS: StatusAction[] = [
  { type: "MATCH_STARTED",       label: "Iniciar",    color: "#4ade80" },
  { type: "HALF_TIME",           label: "Intervalo",  color: "#94a3b8" },
  { type: "SECOND_HALF_STARTED", label: "2º Tempo",   color: "#60a5fa" },
  { type: "MATCH_FINISHED",      label: "Encerrar",   color: "#f87171" },
];

const STATUS_ACTIONS_BY_MATCH_STATUS: Record<string, MatchEventType[]> = {
  SCHEDULED:   ["MATCH_STARTED"],
  NOT_STARTED: ["MATCH_STARTED"],
  LIVE:        ["HALF_TIME", "MATCH_FINISHED"],
  HALF_TIME:   ["SECOND_HALF_STARTED", "MATCH_FINISHED"],
  FINISHED:    [],
};

const STATUS_ACTION_SEQUENCE: MatchEventType[] = [
  "MATCH_STARTED", "HALF_TIME", "SECOND_HALF_STARTED", "MATCH_FINISHED",
];

const STATUS_TONE_CLASS: Record<string, string> = {
  live: "bg-red-400/10 border-red-400/25 text-red-300",
  info: "bg-sky-400/10 border-sky-400/25 text-sky-300",
  warning: "bg-amber-400/10 border-amber-400/25 text-amber-300",
  success: "bg-emerald-400/10 border-emerald-400/25 text-emerald-300",
  neutral: "bg-white/[0.05] border-white/10 text-[--color-text-secondary]",
};


export default function MatchLivePage({ params }: { params: Promise<{ slug: string; matchId: string }> }) {
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [state, setState] = useState<MatchLiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [activeAction, setActiveAction] = useState<MatchEventType | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [highlightedPlayerId, setHighlightedPlayerId] = useState<string | null>(null);
  const [playerView, setPlayerView] = useState<"list" | "field">("list");
  const [hasNoLeague, setHasNoLeague] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tickNowMs, setTickNowMs] = useState(Date.now());

  const token = getToken();
  const running = state?.match.match.is_clock_running ?? false;
  const sessionClosed = state?.session.status === "FINISHED";

  const matchTeams = useMemo(
    () => (state ? getLiveTeamsForMatch(state.teams, state.match.match) : []),
    [state],
  );

  function applyIncomingState(nextState: MatchLiveState) {
    setState(nextState);
    setTickNowMs(Date.now());
  }

  async function refreshMatchState(leagueId: string, matchId: string, authToken: string) {
    const next = await apiRequest<MatchLiveState>(
      `/leagues/${leagueId}/matches/${matchId}/live`,
      { token: authToken },
    );
    applyIncomingState(next);
  }

  async function loadState() {
    const currentToken = getToken();
    if (!currentToken) { router.replace("/login"); return; }
    const { slug, matchId } = await params;
    const resolvedLeague = await getLeagueBySlug(currentToken, slug);
    if (!resolvedLeague) {
      setHasNoLeague(true); setLeague(null); setState(null); setError(""); return;
    }
    const liveState = await apiRequest<MatchLiveState>(
      `/leagues/${resolvedLeague.id}/matches/${matchId}/live`,
      { token: currentToken },
    );
    setLeague(resolvedLeague);
    setHasNoLeague(false);
    applyIncomingState(liveState);
  }

  useEffect(() => {
    void loadState()
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar a partida live."))
      .finally(() => setLoading(false));
  }, [params, router]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTickNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const clockSeconds = useMemo(
    () => (state ? getPersistedMatchClockSeconds(state.match.match, tickNowMs) : 0),
    [state, tickNowMs],
  );

  useEffect(() => {
    if (!league || !token || !state) return;
    const socket = new WebSocket(
      `${WS_BASE_URL}/api/leagues/${league.id}/matches/ws/${state.match.match.id}`,
    );
    socket.onopen = () => socket.send(JSON.stringify({ type: "auth", token }));
    socket.onmessage = (ev) => {
      const payload = JSON.parse(ev.data) as LiveSocketEnvelope<MatchLiveState>;
      if (payload.type === "match.snapshot") applyIncomingState(payload.payload);
    };
    return () => socket.close();
  }, [league, state?.match.match.id, token]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!highlightedPlayerId) return;
    const id = window.setTimeout(() => setHighlightedPlayerId(null), 1600);
    return () => window.clearTimeout(id);
  }, [highlightedPlayerId]);

  useEffect(() => {
    if (!matchTeams.length) { if (selectedTeamId !== null) setSelectedTeamId(null); return; }
    if (!selectedTeamId || !matchTeams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(matchTeams[0].id);
    }
  }, [matchTeams, selectedTeamId]);

  function resetFlow() { setActiveAction(null); }

  // Cartões ativos por jogador (não revertidos)
  const playerCards = useMemo(() => {
    const map = new Map<string, { yellow: number; red: number }>();
    if (!state) return map;
    for (const ev of state.events) {
      if (ev.is_reverted || !ev.player_id) continue;
      const entry = map.get(ev.player_id) ?? { yellow: 0, red: 0 };
      if (ev.event_type === "YELLOW_CARD") entry.yellow += 1;
      if (ev.event_type === "RED_CARD") entry.red += 1;
      map.set(ev.player_id, entry);
    }
    return map;
  }, [state]);

  function isExpelled(playerId: string): boolean {
    const cards = playerCards.get(playerId);
    if (!cards) return false;
    return cards.red >= 1 || cards.yellow >= 2;
  }

  async function postEvent(
    eventType: MatchEventType,
    teamId: string | null,
    playerId: string | null,
  ) {
    await apiRequest(`/leagues/${league!.id}/matches/${state!.match.match.id}/events`, {
      method: "POST", token: token!,
      body: {
        event_type: eventType, team_id: teamId, player_id: playerId,
        related_player_id: null,
        minute: Math.floor(clockSeconds / 60), second: clockSeconds % 60, notes: null,
      },
    });
  }

  async function submitEvent(
    eventType: MatchEventType,
    teamId: string | null = null,
    playerId: string | null = null,
  ) {
    if (!league || !state || !token || submitting) return;
    setError("");
    if (sessionClosed) { setError("Sessao encerrada."); return; }

    // Bloqueia ações em jogadores expulsos (exceto eventos de status)
    if (playerId && FLOW_EVENTS.has(eventType)) {
      if (isExpelled(playerId) && eventType !== "YELLOW_CARD" && eventType !== "RED_CARD") {
        setError("Jogador expulso nao pode receber este evento.");
        resetFlow();
        return;
      }
      // Impede novo cartão em quem já está expulso
      if (isExpelled(playerId) && (eventType === "YELLOW_CARD" || eventType === "RED_CARD")) {
        setError("Jogador ja esta expulso.");
        resetFlow();
        return;
      }
    }

    setSubmitting(true);
    try {
      await postEvent(eventType, teamId, playerId);

      // 2 amarelos = vermelho automático
      if (eventType === "YELLOW_CARD" && playerId) {
        const cards = playerCards.get(playerId) ?? { yellow: 0, red: 0 };
        if (cards.yellow + 1 >= 2) {
          await postEvent("RED_CARD", teamId, playerId);
          setToast("Segundo amarelo — vermelho automático.");
        } else {
          setToast(`${getEventLabel(eventType)} registrado.`);
        }
      } else {
        setToast(`${getEventLabel(eventType)} registrado.`);
      }

      await refreshMatchState(league.id, state.match.match.id, token);
      if (playerId) setHighlightedPlayerId(playerId);
      resetFlow();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nao foi possivel registrar o evento.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStatusAction(action: MatchEventType) {
    if (!league || !state || !token) return;
    const nextStatus = MATCH_STATUS_BY_ACTION[action];
    if (nextStatus && state.match.match.status === nextStatus) {
      setToast(`${getEventLabel(action)} ja aplicado.`); return;
    }
    try {
      setError("");
      if (sessionClosed) { setError("Sessao encerrada."); return; }
      const endpoint =
        action === "MATCH_STARTED"       ? "start"       :
        action === "HALF_TIME"           ? "half-time"   :
        action === "SECOND_HALF_STARTED" ? "second-half" : "finish";
      await apiRequest(`/leagues/${league.id}/matches/${state.match.match.id}/${endpoint}`, {
        method: "POST", token,
        body: { minute: Math.floor(clockSeconds / 60), second: clockSeconds % 60, notes: null },
      });
      await refreshMatchState(league.id, state.match.match.id, token);
      setToast(`${getEventLabel(action)} aplicado.`);
      resetFlow();
      if (action === "MATCH_FINISHED") {
        const { slug } = await params;
        router.push(`/league/${slug}/match?session=${state.session.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nao foi possivel atualizar o status.");
    }
  }

  function handlePickAction(action: MatchEventType) {
    if (submitting) return;
    if (FLOW_EVENTS.has(action)) { setActiveAction(action); return; }
    void submitStatusAction(action);
  }

  function handlePickPlayer(playerId: string) {
    if (!activeAction || !selectedTeamId || submitting) return;
    void submitEvent(activeAction, selectedTeamId, playerId);
  }

  function handleFieldPickPlayer(playerId: string, teamId: string) {
    if (submitting) return;
    setSelectedTeamId(teamId);
    if (!activeAction) return;
    void submitEvent(activeAction, teamId, playerId);
  }

  async function handleRevertEvent(event: MatchEventDetail) {
    if (!league || !state || !token) return;
    try {
      setError("");
      if (sessionClosed) { setError("Sessao encerrada."); return; }
      await apiRequest(`/leagues/${league.id}/matches/${state.match.match.id}/events/${event.id}/revert`, {
        method: "POST", token,
      });
      await refreshMatchState(league.id, state.match.match.id, token);
      setToast("Evento desfeito.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nao foi possivel desfazer o evento.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-[22px] bg-white/[0.04]" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_380px]">
          <div className="space-y-3">
            {[80, 120, 280].map((h) => (
              <div key={h} className="animate-pulse rounded-[22px] bg-white/[0.04]" style={{ height: h }} />
            ))}
          </div>
          <div className="h-[500px] animate-pulse rounded-[22px] bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (hasNoLeague) return <EmptyLeagueState />;
  if (!state) {
    return (
      <div className="page-card">
        <p className="text-sm text-[--color-text-400]">Nenhuma partida encontrada.</p>
      </div>
    );
  }

  const disabled = sessionClosed || state.match.match.status === "FINISHED";
  const selectedTeam = matchTeams.find((t) => t.id === selectedTeamId) ?? null;

  const completedStatusSet = new Set(
    state.events
      .filter((e) => !e.is_reverted)
      .map((e) => e.event_type)
      .filter((t) => STATUS_ACTION_SEQUENCE.includes(t as MatchEventType)),
  );

  let availableStatusActions: MatchEventType[] =
    STATUS_ACTIONS_BY_MATCH_STATUS[state.match.match.status] ?? [];
  if (completedStatusSet.has("MATCH_FINISHED"))        availableStatusActions = [];
  else if (completedStatusSet.has("SECOND_HALF_STARTED")) availableStatusActions = ["MATCH_FINISHED"];
  else if (completedStatusSet.has("HALF_TIME"))           availableStatusActions = ["SECOND_HALF_STARTED", "MATCH_FINISHED"];
  else if (completedStatusSet.has("MATCH_STARTED"))       availableStatusActions = ["HALF_TIME", "MATCH_FINISHED"];

  const tone = getStatusTone(state.match.match.status);
  const badgeClass = STATUS_TONE_CLASS[tone] ?? STATUS_TONE_CLASS.neutral;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Alerts ── */}
      {error ? (
        <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {sessionClosed ? (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Sessao encerrada — modo de leitura.
        </p>
      ) : null}

      {/* ── Scoreboard bar ── */}
      <div className="page-header !py-4 !px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: status + clock */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${badgeClass}`}
            >
              {state.match.match.status === "LIVE" && (
                <span className="live-pill-dot" />
              )}
              {getStatusLabel(state.match.match.status)}
            </span>
            <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-1.5">
              <Timer className="h-3.5 w-3.5 text-[--color-text-muted]" />
              <span className="font-mono text-sm font-bold text-white">
                {formatClock(clockSeconds)}
              </span>
            </div>
            <span className="hidden text-xs text-[--color-text-muted] sm:inline">
              {getMatchPeriodLabel(state.match.match.current_period)}
            </span>
          </div>

          {/* Right: score */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[--color-text-muted]">Casa</p>
              <p className="text-base font-bold text-white">{state.match.home_team_name}</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5">
              <span className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold leading-none text-white">
                {state.match.match.home_score}
              </span>
              <span className="text-lg text-[--color-text-muted]">–</span>
              <span className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold leading-none text-white">
                {state.match.match.away_score}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[--color-text-muted]">Visitante</p>
              <p className="text-base font-bold text-white">{state.match.away_team_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main 2-col layout ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_380px]">

        {/* ═══ LEFT: Action flow ═══ */}
        <div className="space-y-3">

          {/* Match controls */}
          <div className="page-card !p-4">
            <p className="eyebrow mb-3">Controle da partida</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.map((action) => {
                const enabled = availableStatusActions.includes(action.type);
                const done = completedStatusSet.has(action.type as MatchEventType);
                return (
                  <button
                    key={action.type}
                    type="button"
                    disabled={disabled || !enabled || done}
                    onClick={() => void submitStatusAction(action.type)}
                    style={
                      enabled && !done
                        ? { borderColor: `${action.color}44`, color: action.color, background: `${action.color}14` }
                        : undefined
                    }
                    className={[
                      "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                      done
                        ? "border-white/8 bg-white/[0.03] text-[--color-text-muted] opacity-50"
                        : enabled
                          ? "hover:opacity-80"
                          : "border-white/6 bg-white/[0.02] text-[--color-text-muted] opacity-30 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event type selector */}
          <div className="page-card !p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="eyebrow">O que aconteceu?</p>
              {activeAction ? (
                <button
                  type="button"
                  onClick={resetFlow}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-[--color-text-muted] transition hover:text-white"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {EVENT_ACTIONS.map((action) => {
                const active = activeAction === action.type;
                const btnDisabled = disabled || submitting;
                return (
                  <button
                    key={action.type}
                    type="button"
                    disabled={btnDisabled}
                    onClick={() => handlePickAction(action.type)}
                    style={
                      active
                        ? { background: action.activeBg, borderColor: action.activeBorder }
                        : { background: action.bg, borderColor: "rgba(255,255,255,0.08)" }
                    }
                    className={[
                      "flex flex-col items-center gap-2 rounded-2xl border py-4 transition-all",
                      active ? "scale-[1.03] shadow-lg" : "hover:border-white/14 hover:scale-[1.02]",
                      btnDisabled ? "pointer-events-none opacity-40" : "",
                    ].join(" ")}
                  >
                    <span className="text-2xl leading-none">{action.emoji}</span>
                    <span className="text-[11px] font-bold text-white">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team + Player */}
          <div className="page-card !p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="eyebrow">{activeAction ? "Qual time e jogador?" : "Times"}</p>
              {/* View toggle */}
              <div className="flex rounded-xl border border-white/8 bg-white/[0.03] p-0.5">
                {(["list", "field"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPlayerView(v)}
                    className={[
                      "rounded-[10px] px-3 py-1 text-xs font-semibold transition-all",
                      playerView === v
                        ? "bg-white/10 text-white"
                        : "text-[--color-text-muted] hover:text-white",
                    ].join(" ")}
                  >
                    {v === "list" ? "Lista" : "Campo"}
                  </button>
                ))}
              </div>
            </div>

            {playerView === "field" ? (
              <div className="mx-auto w-full max-w-[270px]">
                <MiniField
                  teams={matchTeams}
                  events={state.events}
                  selectedTeamId={selectedTeamId}
                  activeAction={activeAction}
                  highlightedPlayerId={highlightedPlayerId}
                  disabled={disabled}
                  onSelectPlayer={handleFieldPickPlayer}
                />
              </div>
            ) : (
              <>
                {/* Team tabs */}
                <div className="flex gap-2">
                  {matchTeams.map((team) => {
                    const sel = team.id === selectedTeamId;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => setSelectedTeamId(team.id)}
                        className={[
                          "flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all",
                          sel
                            ? "border-[--color-accent-primary]/30 bg-[--color-accent-primary]/10 text-[--color-accent-primary]"
                            : "border-white/8 bg-white/[0.03] text-[--color-text-secondary] hover:bg-white/[0.06] hover:text-white",
                        ].join(" ")}
                      >
                        {team.name}
                      </button>
                    );
                  })}
                </div>

                {/* Player grid */}
                {selectedTeam ? (
                  <div className="mt-4">
                    <p className="eyebrow mb-3">
                      {activeAction ? "Quem foi?" : `Elenco — ${selectedTeam.name}`}
                    </p>
                    {activeAction ? (
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {selectedTeam.players.map((player) => {
                          const expelled = isExpelled(player.player_id);
                          const playerDisabled = submitting || expelled;
                          return (
                            <button
                              key={player.player_id}
                              type="button"
                              disabled={playerDisabled}
                              onClick={() => handlePickPlayer(player.player_id)}
                              className={[
                                "rounded-xl border px-3 py-2.5 text-left transition-all",
                                expelled
                                  ? "border-red-400/20 bg-red-400/[0.06] opacity-50 cursor-not-allowed"
                                  : "border-white/8 bg-white/[0.03] hover:border-[--color-accent-primary]/30 hover:bg-[--color-accent-primary]/8 hover:text-[--color-accent-primary]",
                                highlightedPlayerId === player.player_id
                                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                                  : "",
                              ].join(" ")}
                            >
                              <span className="block truncate text-sm font-semibold text-white">
                                {player.player_name}
                                {player.is_captain ? (
                                  <span className="ml-1 text-[10px] text-[--color-accent-primary]">C</span>
                                ) : null}
                                {expelled ? <span className="ml-1 text-[10px] text-red-400">🟥</span> : null}
                              </span>
                              <span className="text-[10px] text-[--color-text-muted]">
                                {expelled ? "Expulso" : (player.position ?? "Livre")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-4 text-center text-sm text-[--color-text-muted]">
                        Selecione um evento para registrar um jogador.
                      </p>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Event feed ═══ */}
        <div className="page-card !p-4 xl:sticky xl:top-4 xl:self-start flex flex-col" style={{ maxHeight: "calc(100vh - 6rem)" }}>
          <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
            <p className="eyebrow">Feed ao vivo</p>
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-[--color-text-muted]">
              {state.events.length}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
            <EventFeed
              events={[...state.events].reverse()}
              editable={!sessionClosed && state.match.match.status !== "FINISHED"}
              onRevert={handleRevertEvent}
            />
          </div>
        </div>
      </div>

      {toast ? <QuickConfirmationToast message={toast} /> : null}
    </div>
  );
}
