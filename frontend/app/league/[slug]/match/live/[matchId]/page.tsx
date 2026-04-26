"use client";

import { Flag, Radar, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { EventFeed } from "@/components/live/event-feed";
import { LiveActionFlowSteps, LiveActionPanel } from "@/components/live/live-action-panel";
import { LiveFootballField } from "@/components/live/live-football-field";
import { LiveMatchReport } from "@/components/live/live-match-report";
import { LivePlayerSpotlight } from "@/components/live/live-player-spotlight";
import { LiveScoreboard } from "@/components/live/live-scoreboard";
import { QuickConfirmationToast } from "@/components/live/quick-confirmation-toast";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiRequest, WS_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatClock, getEventLabel, getMatchPeriodLabel, getPersistedMatchClockSeconds, getStatusLabel } from "@/lib/live";
import { getLeagueBySlug } from "@/lib/league";
import { getLiveTeamsForMatch } from "@/lib/session";
import { getStatusTone } from "@/lib/ui";
import type { League, LiveSocketEnvelope, MatchEventDetail, MatchEventType, MatchLiveState } from "@/lib/types";


const FLOW_EVENTS = new Set<MatchEventType>(["GOAL", "ASSIST", "FOUL", "YELLOW_CARD", "RED_CARD"]);
const MATCH_STATUS_BY_ACTION: Partial<Record<MatchEventType, string>> = {
  MATCH_STARTED: "LIVE",
  HALF_TIME: "HALF_TIME",
  SECOND_HALF_STARTED: "LIVE",
  MATCH_FINISHED: "FINISHED",
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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [highlightedPlayerId, setHighlightedPlayerId] = useState<string | null>(null);
  const [hasNoLeague, setHasNoLeague] = useState(false);
  const [tickNowMs, setTickNowMs] = useState(Date.now());

  const token = getToken();
  const running = state?.match.match.is_clock_running ?? false;
  const sessionClosed = state?.session.status === "FINISHED";

  const matchTeams = useMemo(
    () => (state ? getLiveTeamsForMatch(state.teams, state.match.match) : []),
    [state],
  );
  const selectedPlayer = useMemo(
    () => matchTeams.flatMap((team) => team.players).find((player) => player.player_id === selectedPlayerId) ?? null,
    [matchTeams, selectedPlayerId],
  );
  const selectedPlayerTeam = useMemo(
    () => matchTeams.find((team) => team.players.some((player) => player.player_id === selectedPlayerId)) ?? null,
    [matchTeams, selectedPlayerId],
  );

  function applyIncomingState(nextState: MatchLiveState) {
    setState(nextState);
    setTickNowMs(Date.now());
  }

  async function refreshMatchState(leagueId: string, matchId: string, authToken: string) {
    const refreshedState = await apiRequest<MatchLiveState>(`/leagues/${leagueId}/matches/${matchId}/live`, { token: authToken });
    applyIncomingState(refreshedState);
  }

  async function loadState() {
    const currentToken = getToken();
    if (!currentToken) {
      router.replace("/login");
      return;
    }

    const { slug, matchId } = await params;
    const resolvedLeague = await getLeagueBySlug(currentToken, slug);
    if (!resolvedLeague) {
      setHasNoLeague(true);
      setLeague(null);
      setState(null);
      setError("");
      return;
    }
    const liveState = await apiRequest<MatchLiveState>(`/leagues/${resolvedLeague.id}/matches/${matchId}/live`, { token: currentToken });

    setLeague(resolvedLeague);
    setHasNoLeague(false);
    applyIncomingState(liveState);
  }

  useEffect(() => {
    void loadState()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Erro ao carregar a partida live."))
      .finally(() => setLoading(false));
  }, [params, router]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = window.setInterval(() => setTickNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [running]);

  const clockSeconds = useMemo(
    () => (state ? getPersistedMatchClockSeconds(state.match.match, tickNowMs) : 0),
    [state, tickNowMs],
  );

  useEffect(() => {
    if (!league || !token || !state) {
      return;
    }

    const socket = new WebSocket(
      `${WS_BASE_URL}/api/leagues/${league.id}/matches/ws/${state.match.match.id}`,
    );
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "auth", token }));
    };
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as LiveSocketEnvelope<MatchLiveState>;
      if (payload.type === "match.snapshot") {
        applyIncomingState(payload.payload);
      }
    };

    return () => socket.close();
  }, [league, state?.match.match.id, token]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!highlightedPlayerId) {
      return;
    }
    const timeout = window.setTimeout(() => setHighlightedPlayerId(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [highlightedPlayerId]);

  useEffect(() => {
    if (!matchTeams.length) {
      if (selectedTeamId !== null) {
        setSelectedTeamId(null);
      }
      return;
    }

    if (!selectedTeamId || !matchTeams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(matchTeams[0].id);
    }
  }, [matchTeams, selectedTeamId]);

  function resetFlow() {
    setActiveAction(null);
    setSelectedTeamId(null);
  }

  async function submitEvent(eventType: MatchEventType, teamId: string | null = null, playerId: string | null = null) {
    if (!league || !state || !token) {
      return;
    }

    try {
      setError("");
      if (sessionClosed) {
        setError("Sessao encerrada. O modo ao vivo esta bloqueado para novos eventos.");
        return;
      }
      await apiRequest(`/leagues/${league.id}/matches/${state.match.match.id}/events`, {
        method: "POST",
        token,
        body: {
          event_type: eventType,
          team_id: teamId,
          player_id: playerId,
          related_player_id: null,
          minute: Math.floor(clockSeconds / 60),
          second: clockSeconds % 60,
          notes: null,
        },
      });
      await refreshMatchState(league.id, state.match.match.id, token);
      if (playerId) {
        setHighlightedPlayerId(playerId);
      }
      setToast(`${getEventLabel(eventType)} registrado.`);
      resetFlow();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel registrar o evento.");
    }
  }

  async function submitStatusAction(action: MatchEventType) {
    if (!league || !state || !token) {
      return;
    }

    const nextStatus = MATCH_STATUS_BY_ACTION[action];
    if (nextStatus && state.match.match.status === nextStatus) {
      setToast(`${getEventLabel(action)} ja aplicado.`);
      return;
    }

    try {
      setError("");
      if (sessionClosed) {
        setError("Sessao encerrada. O modo ao vivo esta bloqueado para novos eventos.");
        return;
      }
      const endpoint =
        action === "MATCH_STARTED"
          ? "start"
          : action === "HALF_TIME"
            ? "half-time"
            : action === "SECOND_HALF_STARTED"
              ? "second-half"
              : "finish";
      await apiRequest(`/leagues/${league.id}/matches/${state.match.match.id}/${endpoint}`, {
        method: "POST",
        token,
        body: {
          minute: Math.floor(clockSeconds / 60),
          second: clockSeconds % 60,
          notes: null,
        },
      });
      await refreshMatchState(league.id, state.match.match.id, token);
      setToast(`${getEventLabel(action)} aplicado.`);
      resetFlow();
      if (action === "MATCH_FINISHED") {
        const { slug } = await params;
        router.push(`/league/${slug}/match?session=${state.session.id}`);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel atualizar o status.");
    }
  }

  function handlePickAction(action: MatchEventType) {
    if (FLOW_EVENTS.has(action)) {
      setActiveAction(action);
      setSelectedTeamId(null);
      return;
    }
    void submitStatusAction(action);
  }

  function handlePickTeam(teamId: string) {
    setSelectedTeamId(teamId);
  }

  function handlePickPlayer(playerId: string) {
    if (!activeAction || !selectedTeamId) {
      setSelectedPlayerId(playerId);
      return;
    }
    setSelectedPlayerId(playerId);
    void submitEvent(activeAction, selectedTeamId, playerId);
  }

  function handlePickFieldPlayer(playerId: string, teamId: string) {
    setSelectedTeamId(teamId);
    setSelectedPlayerId(playerId);
    if (!activeAction) {
      return;
    }
    void submitEvent(activeAction, teamId, playerId);
  }

  async function handleRevertEvent(event: MatchEventDetail) {
    if (!league || !state || !token) {
      return;
    }

    try {
      setError("");
      if (sessionClosed) {
        setError("Sessao encerrada. Eventos nao podem mais ser revertidos.");
        return;
      }
      await apiRequest(`/leagues/${league.id}/matches/${state.match.match.id}/events/${event.id}/revert`, {
        method: "POST",
        token,
      });
      await refreshMatchState(league.id, state.match.match.id, token);
      setToast("Evento desfeito.");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel desfazer o evento.");
    }
  }

  if (loading) {
    return <div className="space-y-6"><div className="page-card h-56" /><div className="page-card h-[640px]" /></div>;
  }

  if (hasNoLeague) {
    return <EmptyLeagueState />;
  }

  if (!state) {
    return <div className="page-card"><p className="text-sm text-[--color-text-400]">Nenhuma partida encontrada.</p></div>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {sessionClosed ? <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">Sessao encerrada. Esta cabine esta em modo de leitura.</p> : null}

      <LiveScoreboard
        homeName={state.match.home_team_name}
        awayName={state.match.away_team_name}
        homeScore={state.match.match.home_score}
        awayScore={state.match.match.away_score}
        status={getStatusLabel(state.match.match.status)}
        period={getMatchPeriodLabel(state.match.match.current_period)}
        clock={formatClock(clockSeconds)}
        context={`Cabine pronta para operar ${state.session.title} com feed, placar e eventos em fluxo curto.`}
      />

      <LiveActionPanel
        teams={state.teams}
        match={state.match.match}
        events={state.events}
        activeAction={activeAction}
        selectedTeamId={selectedTeamId}
        disabled={sessionClosed || state.match.match.status === "FINISHED"}
        showFlowSteps={false}
        onPickAction={handlePickAction}
        onPickTeam={handlePickTeam}
        onPickPlayer={handlePickPlayer}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <LiveFootballField
          teams={matchTeams}
          selectedTeamId={selectedTeamId}
          events={state.events}
          action={activeAction}
          disabled={sessionClosed || state.match.match.status === "FINISHED"}
          highlightedPlayerId={highlightedPlayerId}
          onSelectPlayer={handlePickFieldPlayer}
        />

        <LiveMatchReport events={state.events} />
      </section>

      <LiveActionFlowSteps
        teams={state.teams}
        match={state.match.match}
        events={state.events}
        activeAction={activeAction}
        selectedTeamId={selectedTeamId}
        disabled={sessionClosed || state.match.match.status === "FINISHED"}
        onPickAction={handlePickAction}
        onPickTeam={handlePickTeam}
        onPickPlayer={handlePickPlayer}
      />

      <LivePlayerSpotlight
        player={selectedPlayer}
        team={selectedPlayerTeam}
        events={state.events}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="page-card">
          <SectionHeader eyebrow="Feed ao vivo" title="Linha operacional da partida" description="Tudo o que aconteceu em campo aparece aqui em ordem cronologica, com opcao de desfazer rapidamente." />
          <div className="mt-6">
            <EventFeed
              events={state.events}
              editable={!sessionClosed && state.match.match.status !== "FINISHED"}
              onRevert={handleRevertEvent}
            />
          </div>
        </div>

        <div className="space-y-6">
          <section className="page-card">
            <SectionHeader eyebrow="Pulso da partida" title="Contexto instantaneo" />
            <div className="mt-6 grid gap-4">
              <div className="surface-elevated p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                    <Radar className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[--color-text-400]">Status</p>
                    <div className="mt-2 flex items-center gap-3">
                      <strong className="text-xl text-white">{getStatusLabel(state.match.match.status)}</strong>
                      <StatusBadge tone={getStatusTone(state.match.match.status)}>{state.match.match.status}</StatusBadge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface-elevated p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-100">
                    <Flag className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[--color-text-400]">Ultimo evento</p>
                    <strong className="mt-2 block text-white">
                      {state.match.last_event ? `${getEventLabel(state.match.last_event.event_type)} • ${state.match.last_event.player_name ?? "geral"}` : "Partida sem ocorrencias ainda"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="page-card">
            <SectionHeader eyebrow="Elencos acessiveis" title="Jogadores dos dois lados" description="Os atletas da partida ficam visiveis sem esconder camadas de contexto." />
            <div className="mt-6 space-y-4">
              {matchTeams.map((team) => (
                <div key={team.id} className="surface-elevated p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">Time</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{team.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[--color-text-400]">Forca</p>
                      <strong className="text-white">{team.total_strength}</strong>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {team.players.map((player) => (
                      <div key={player.player_id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-white">{player.player_name}</p>
                            <p className="text-sm text-[--color-text-400]">{player.position ?? "Livre"}{player.is_captain ? " • capitao" : ""}</p>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                            <Users className="h-3.5 w-3.5" />
                            OVR {player.overall}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      {toast ? <QuickConfirmationToast message={toast} /> : null}
    </div>
  );
}
