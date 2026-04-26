"use client";

import Link from "next/link";
import { Crosshair, Radar, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { LiveFeed } from "@/components/live/live-feed";
import { OperatorModeLayout } from "@/components/live/operator-mode-layout";
import { Scoreboard } from "@/components/live/scoreboard";
import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchCard } from "@/components/ui/match-card";
import { SectionHeader } from "@/components/ui/section-header";
import { SessionCard } from "@/components/ui/session-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { apiRequest, WS_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { describeEvent, getStatusLabel } from "@/lib/live";
import { getLeagueBySlug } from "@/lib/league";
import type { League, LiveMatchCard, LiveSocketEnvelope, SessionItem, SessionLiveState, SessionTeam } from "@/lib/types";

const KNOCKOUT_STAGES = new Set(["SEMIFINAL", "WINNERS_FINAL", "LOSERS_FINAL", "FINAL", "THIRD_PLACE", "INITIAL_MATCH", "WINNERS_MATCH", "ROTATION"]);


export default function MatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [league, setLeague] = useState<League | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionState, setSessionState] = useState<SessionLiveState | null>(null);
  const [teams, setTeams] = useState<SessionTeam[]>([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasNoLeague, setHasNoLeague] = useState(false);

  const roundStats = useMemo(() => {
    const matches = sessionState?.matches ?? [];
    return {
      total: matches.length,
      live: matches.filter((item) => item.match.status === "LIVE").length,
      finished: matches.filter((item) => item.match.status === "FINISHED").length,
    };
  }, [sessionState]);

  const queue = sessionState?.queue ?? [];
  const sessionClosed = sessionState?.session.status === "FINISHED";

  function canFinishMatch(item: LiveMatchCard) {
    if (!["LIVE", "HALF_TIME"].includes(item.match.status)) {
      return false;
    }

    if (KNOCKOUT_STAGES.has(item.match.stage) && item.match.home_score === item.match.away_score) {
      return false;
    }

    return true;
  }

  async function ensureSessionMatches(leagueId: string, session: SessionItem, teamList: SessionTeam[]) {
    const token = getToken();
    if (!token) {
      return false;
    }
    if (session.status === "FINISHED") {
      return false;
    }
    if (![2, 3, 4].includes(teamList.length)) {
      return false;
    }

    await apiRequest(`/leagues/${leagueId}/sessions/${session.id}/matches/generate`, {
      method: "POST",
      token,
    });
    return true;
  }

  async function loadSessionState(leagueId: string, sessionId: string) {
    const token = getToken();
    if (!token || !sessionId) {
      setSessionState(null);
      setTeams([]);
      return;
    }

    const [liveState, teamList] = await Promise.all([
      apiRequest<SessionLiveState>(`/leagues/${leagueId}/matches/session/${sessionId}/live`, { token }),
      apiRequest<SessionTeam[]>(`/leagues/${leagueId}/sessions/${sessionId}/teams`, { token }),
    ]);
    const session = sessions.find((item) => item.id === sessionId) ?? liveState.session;

    if (liveState.matches.length === 0 && teamList.length >= 2) {
      const generated = await ensureSessionMatches(leagueId, session, teamList);
      if (generated) {
        const refreshedLiveState = await apiRequest<SessionLiveState>(`/leagues/${leagueId}/matches/session/${sessionId}/live`, { token });
        setSessionState(refreshedLiveState);
        setTeams(teamList);
        setSuccess("Confrontos da rodada gerados automaticamente.");
        return;
      }
    }

    setSessionState(liveState);
    setTeams(teamList);
    setSessions((currentSessions) => currentSessions.map((item) => (item.id === sessionId ? liveState.session : item)));
  }

  async function loadData() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const { slug } = await params;
    const resolvedLeague = await getLeagueBySlug(token, slug);
    if (!resolvedLeague) {
      setHasNoLeague(true);
      setLeague(null);
      setSessions([]);
      setSelectedSessionId("");
      setSessionState(null);
      setTeams([]);
      return;
    }
    const leagueSessions = await apiRequest<SessionItem[]>(`/leagues/${resolvedLeague.id}/sessions`, { token });
    const requestedSessionId = searchParams.get("session");
    const currentSessionId = requestedSessionId || selectedSessionId || leagueSessions[0]?.id || "";

    setLeague(resolvedLeague);
    setHasNoLeague(false);
    setSessions(leagueSessions);
    setSelectedSessionId(currentSessionId);

    if (currentSessionId) {
      await loadSessionState(resolvedLeague.id, currentSessionId);
    }
  }

  useEffect(() => {
    void loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Erro ao carregar a central ao vivo."))
      .finally(() => setLoading(false));
  }, [params, router, searchParams]);

  useEffect(() => {
    const token = getToken();
    if (!league || !selectedSessionId || !token) {
      return;
    }

    const socket = new WebSocket(
      `${WS_BASE_URL}/api/leagues/${league.id}/matches/ws/session/${selectedSessionId}`,
    );
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "auth", token }));
    };
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as LiveSocketEnvelope<SessionLiveState>;
      if (payload.type === "session.snapshot") {
        setSessionState(payload.payload);
      }
    };

    return () => socket.close();
  }, [league, selectedSessionId]);

  async function handleSelectSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    if (!league) {
      return;
    }
    try {
      setError("");
      setSuccess("");
      await loadSessionState(league.id, sessionId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar a rodada.");
    }
  }

  async function handleCreateMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token || !league || !selectedSessionId) {
      return;
    }

    try {
      setError("");
      if (sessionClosed) {
        setError("Sessao encerrada. A central ao vivo esta em modo de leitura.");
        return;
      }
      await apiRequest(`/leagues/${league.id}/matches`, {
        method: "POST",
        token,
        body: {
          session_id: selectedSessionId,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
        },
      });
      setHomeTeamId("");
      setAwayTeamId("");
      setSuccess("Partida criada e adicionada a central ao vivo.");
      await loadSessionState(league.id, selectedSessionId);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel criar a partida.");
    }
  }

  async function handleQuickStatus(matchId: string, status: string, currentStatus: string, item?: LiveMatchCard) {
    const token = getToken();
    if (!token || !league) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      if (sessionClosed) {
        setError("Sessao encerrada. Nao e mais possivel operar partidas.");
        return;
      }
      if (status === "FINISHED") {
        if (!item || !["LIVE", "HALF_TIME"].includes(currentStatus)) {
          setError("Inicie a partida antes de tentar encerrar.");
          return;
        }
        if (KNOCKOUT_STAGES.has(item.match.stage) && item.match.home_score === item.match.away_score) {
          setError("Partidas de mata-mata nao podem ser encerradas empatadas.");
          return;
        }
        await apiRequest(`/leagues/${league.id}/matches/${matchId}/finish`, { method: "POST", token });
      } else if (status === "LIVE") {
        const endpoint = currentStatus === "HALF_TIME" ? "second-half" : "start";
        await apiRequest(`/leagues/${league.id}/matches/${matchId}/${endpoint}`, {
          method: "POST",
          token,
          body: { minute: 0, second: 0, notes: null },
        });
      } else {
        const endpoint = status === "HALF_TIME" ? "half-time" : "second-half";
        await apiRequest(`/leagues/${league.id}/matches/${matchId}/${endpoint}`, {
          method: "POST",
          token,
          body: { minute: 0, second: 0, notes: null },
        });
      }
      setSuccess("Status da partida atualizado.");
      if (selectedSessionId) {
        await loadSessionState(league.id, selectedSessionId);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel atualizar o status.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-56 rounded-[28px]" />
        <SkeletonCard className="h-[620px] rounded-[28px]" />
      </div>
    );
  }

  if (hasNoLeague) {
    return <EmptyLeagueState />;
  }

  return (
    <OperatorModeLayout
      eyebrow="Central ao vivo"
      title="A rodada vira uma mesa de operacao esportiva."
      subtitle="Cards de partida, feed, status e atalhos para a cabine live com leitura rapida em desktop e celular."
      status={sessionState ? `Rodada ${getStatusLabel(sessionState.session.status)}` : "Sem rodada selecionada"}
      actions={
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Partidas</p><strong className="mt-2 block text-xl text-white">{roundStats.total}</strong></div>
          <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Ao vivo</p><strong className="mt-2 block text-xl text-white">{roundStats.live}</strong></div>
          <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Encerradas</p><strong className="mt-2 block text-xl text-white">{roundStats.finished}</strong></div>
        </div>
      }
    >
      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {success ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}

      <section className="page-card">
        <SectionHeader eyebrow="Escolha da rodada" title="Sessoes em operacao" />
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sessions.map((session) => (
            <button key={session.id} type="button" className="text-left" onClick={() => void handleSelectSession(session.id)}>
              <div className={selectedSessionId === session.id ? "rounded-[28px] ring-1 ring-sky-400/25" : ""}>
                <SessionCard session={session} />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="page-card">
          <SectionHeader eyebrow="Chaveamento" title="Partidas da rodada" />
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {!sessionState || sessionState.matches.length === 0 ? (
              <EmptyState title="Nenhuma partida gerada" description="Crie os confrontos da rodada para liberar a operacao live." />
            ) : (
              sessionState.matches.map((item) => (
                <div key={item.match.id} className="space-y-3">
                  <div className={sessionState.current_match_id === item.match.id ? "rounded-[28px] ring-1 ring-emerald-300/30" : ""}>
                    <MatchCard item={item} href={`/league/${league?.slug}/match/live/${item.match.id}`} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(item.match.status === "SCHEDULED" || item.match.status === "NOT_STARTED") && (
                      <button type="button" className="btn-secondary" disabled={sessionClosed} onClick={() => void handleQuickStatus(item.match.id, "LIVE", item.match.status, item)}>Iniciar</button>
                    )}
                    {item.match.status === "LIVE" && (
                      <button type="button" className="btn-secondary" disabled={sessionClosed} onClick={() => void handleQuickStatus(item.match.id, "HALF_TIME", item.match.status, item)}>Intervalo</button>
                    )}
                    {item.match.status === "HALF_TIME" && (
                      <button type="button" className="btn-secondary" disabled={sessionClosed} onClick={() => void handleQuickStatus(item.match.id, "LIVE", item.match.status, item)}>Retomar</button>
                    )}
                    {["LIVE", "HALF_TIME"].includes(item.match.status) && (
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={sessionClosed || !canFinishMatch(item)}
                        onClick={() => void handleQuickStatus(item.match.id, "FINISHED", item.match.status, item)}
                      >
                        Encerrar
                      </button>
                    )}
                    {["LIVE", "HALF_TIME"].includes(item.match.status) && !canFinishMatch(item) ? (
                      <span className="self-center text-xs text-[--color-text-400]">Desempate antes de encerrar.</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="page-card">
          <SectionHeader eyebrow="Painel da rodada" title="Operacao e contexto" description="Resumo rapido da sessao, partida destaque e fallback manual apenas se voce realmente precisar." />

          <div className="mt-6 space-y-4">
            <div className="surface-elevated p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Status da rodada</p>
                  <strong className="mt-2 block text-xl text-white">{sessionState ? getStatusLabel(sessionState.session.status) : "Sem sessao ativa"}</strong>
                  <p className="mt-2 text-sm text-[--color-text-400]">{sessionClosed ? "Sessao congelada com operacao bloqueada." : sessionState?.session.flow_phase === "ROTATION_STAGE" ? "Modo permanencia ativo" : "Fase inicial da rodada"}</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                  <Radar className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm text-[--color-text-400]">
                {sessionClosed
                  ? "A rodada foi encerrada e a central agora funciona apenas como painel de consulta."
                  : roundStats.total
                  ? "As partidas desta rodada ja estao montadas e prontas para iniciar."
                  : "Se os times ja existem, os confrontos devem nascer automaticamente ao abrir esta central."}
              </p>
            </div>

            <div className="surface-elevated p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Quadra e fila</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[--color-text-400]">Time que fica</p>
                  <strong className="mt-2 block text-white">{sessionState?.current_staying_team_name ?? "A definir"}</strong>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[--color-text-400]">Desafiante atual</p>
                  <strong className="mt-2 block text-white">{sessionState?.challenger_team_name ?? "Aguardando jogo 3"}</strong>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[--color-text-400]">Fila</p>
                  <div className="mt-3 space-y-2">
                    {queue.length ? queue.map((team) => (
                      <div key={team.id} className="flex items-center justify-between gap-3 text-sm text-white">
                        <span>{team.name}</span>
                        <span className="text-[--color-text-400]">#{team.queue_order}</span>
                      </div>
                    )) : <p className="text-sm text-[--color-text-400]">Nenhum time aguardando.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-elevated p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Ajustes da sessao</p>
                  <strong className="mt-2 block text-xl text-white">Monte e refine a rodada</strong>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-100">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                <Link href={`/league/${league?.slug}/session`} className="btn-primary w-full">Abrir montagem da rodada</Link>
                {sessionClosed ? <p className="text-sm text-[--color-text-400]">Sessao encerrada. Criacao de partidas e operacao ao vivo foram bloqueadas.</p> : null}
              </div>
            </div>

            {roundStats.total === 0 && !sessionClosed ? (
              <div className="surface-elevated p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Fallback manual</p>
                    <strong className="mt-2 block text-xl text-white">Adicionar partida</strong>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Crosshair className="h-5 w-5" />
                  </span>
                </div>
                <form className="mt-5 space-y-4" onSubmit={handleCreateMatch}>
                  <select className="input-shell w-full" value={homeTeamId} onChange={(event) => setHomeTeamId(event.target.value)} required>
                    <option value="">Selecione o mandante</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  <select className="input-shell w-full" value={awayTeamId} onChange={(event) => setAwayTeamId(event.target.value)} required>
                    <option value="">Selecione o visitante</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondary w-full">Criar partida manual</button>
                </form>
              </div>
            ) : null}
          </div>

          {sessionState?.matches.find((item) => item.match.id === sessionState.current_match_id) ?? sessionState?.matches[0] ? (
            <div className="mt-6">
              {(() => {
                const featuredMatch = sessionState.matches.find((item) => item.match.id === sessionState.current_match_id) ?? sessionState.matches[0];
                return (
              <Scoreboard
                homeName={featuredMatch.home_team_name}
                awayName={featuredMatch.away_team_name}
                homeScore={featuredMatch.match.home_score}
                awayScore={featuredMatch.match.away_score}
                homeColor={featuredMatch.home_team_color}
                awayColor={featuredMatch.away_team_color}
                status={getStatusLabel(featuredMatch.match.status)}
                meta={featuredMatch.last_event ? describeEvent(featuredMatch.last_event) : "Proximo confronto destacado"}
              />
                );
              })()}
            </div>
          ) : null}
        </div>
      </section>

      <section className="page-card">
        <SectionHeader eyebrow="Feed ao vivo" title="Ultimos eventos da rodada" />
        <div className="mt-6">
          <LiveFeed events={sessionState?.recent_events ?? []} />
        </div>
      </section>
    </OperatorModeLayout>
  );
}
