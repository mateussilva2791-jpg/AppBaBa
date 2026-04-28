"use client";

import Link from "next/link";
import { CheckCircle2, Shield, Sparkles, Swords, Trophy, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { SessionFinalSummary } from "@/components/session/session-final-summary";
import { RoundHighlightsPanel } from "@/components/session/round-highlights-panel";
import { SessionBracketView } from "@/components/session/session-bracket";
import { TeamStrengthCard } from "@/components/session/team-strength-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { PlayerStatCard } from "@/components/ui/player-stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { SessionCard } from "@/components/ui/session-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError, apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getLeagueBySlug } from "@/lib/league";
import { getBalanceLabel, getBalanceTone, getComparisonHeadline, getSafeTeamStrength, getTeamStrengthRange } from "@/lib/session";
import { getStatusTone } from "@/lib/ui";
import type {
  GeneratedTeam,
  League,
  Player,
  SessionBracket,
  SessionFinalizeSummary,
  SessionHighlights,
  SessionItem,
  SessionLiveState,
  SessionPlayer,
  SessionSummary,
  SessionTeam,
  SessionTeamPlayer,
  SessionWorkflow,
  TeamComparison,
  TeamGenerationResponse,
} from "@/lib/types";


function deriveOverall(player: Pick<Player, "attack_rating" | "passing_rating" | "defense_rating" | "stamina_rating" | "skill_level">) {
  const technicalCore =
    player.attack_rating * 0.31
    + player.passing_rating * 0.23
    + player.defense_rating * 0.26
    + player.stamina_rating * 0.2;
  return Math.round(technicalCore * 0.68 + player.skill_level * 10 * 0.32);
}

function deriveBalanceScore(player: Player) {
  const overall = deriveOverall(player);
  return (
    overall * 7
    + player.skill_level * 18
    + player.attack_rating * 3
    + player.passing_rating * 2
    + player.defense_rating * 3
    + player.stamina_rating * 2
  );
}

function buildGeneratedTeamsFromAssignments(sessionTeams: SessionTeam[], teamPlayers: SessionTeamPlayer[], roster: Player[]) {
  const rosterById = new Map(roster.map((player) => [player.id, player]));

  const teams = sessionTeams.map((team) => {
    const assignedPlayers = teamPlayers
      .filter((item) => item.team_id === team.id)
      .map((item) => rosterById.get(item.player_id))
      .filter((player): player is Player => Boolean(player));

    const totalStrength = assignedPlayers.reduce((total, player) => total + deriveBalanceScore(player), 0);
    const attackTotal = assignedPlayers.reduce((total, player) => total + player.attack_rating, 0);
    const passingTotal = assignedPlayers.reduce((total, player) => total + player.passing_rating, 0);
    const defenseTotal = assignedPlayers.reduce((total, player) => total + player.defense_rating, 0);
    const staminaTotal = assignedPlayers.reduce((total, player) => total + player.stamina_rating, 0);
    const averageOverall = assignedPlayers.length
      ? Math.round(assignedPlayers.reduce((total, player) => total + deriveOverall(player), 0) / assignedPlayers.length)
      : 0;

    return {
      team_id: team.id,
      name: team.name,
      color: team.color,
      total_skill: totalStrength,
      balance_delta: 0,
      balance_state: "BALANCED",
      strength: {
        total_strength: totalStrength,
        average_overall: averageOverall,
        attack_total: attackTotal,
        passing_total: passingTotal,
        defense_total: defenseTotal,
        stamina_total: staminaTotal,
      },
      players: assignedPlayers.map((player) => ({
        player_id: player.id,
        player_name: player.name,
        position: player.position,
        ovr: player.ovr,
        overall: deriveOverall(player),
        balance_score: deriveBalanceScore(player),
        attack_rating: player.attack_rating,
        passing_rating: player.passing_rating,
        defense_rating: player.defense_rating,
        stamina_rating: player.stamina_rating,
        relative_speed: player.relative_speed,
        relative_strength: player.relative_strength,
        skill_level: player.skill_level,
      })),
    } satisfies GeneratedTeam;
  });

  const strengths = teams.map((team) => getSafeTeamStrength(team).total_strength);
  const averageStrength = strengths.length ? Math.round(strengths.reduce((sum, item) => sum + item, 0) / strengths.length) : 0;
  const strongest = teams.reduce<GeneratedTeam | null>((current, team) => (!current || getSafeTeamStrength(team).total_strength > getSafeTeamStrength(current).total_strength ? team : current), null);
  const weakest = teams.reduce<GeneratedTeam | null>((current, team) => (!current || getSafeTeamStrength(team).total_strength < getSafeTeamStrength(current).total_strength ? team : current), null);

  const normalizedTeams = teams.map((team) => {
    const balanceDelta = Math.abs(getSafeTeamStrength(team).total_strength - averageStrength);
    return {
      ...team,
      balance_delta: balanceDelta,
      balance_state: balanceDelta <= 12 ? "BALANCED" : balanceDelta <= 30 ? "WARNING" : "UNBALANCED",
    };
  });

  const comparison: TeamComparison = {
    strongest_team_id: strongest?.team_id ?? null,
    weakest_team_id: weakest?.team_id ?? null,
    strength_gap: strongest && weakest ? getSafeTeamStrength(strongest).total_strength - getSafeTeamStrength(weakest).total_strength : 0,
    average_strength: averageStrength,
    balance_state:
      strongest && weakest
        ? getSafeTeamStrength(strongest).total_strength - getSafeTeamStrength(weakest).total_strength <= 24
          ? "BALANCED"
          : getSafeTeamStrength(strongest).total_strength - getSafeTeamStrength(weakest).total_strength <= 60
            ? "WARNING"
            : "UNBALANCED"
        : "BALANCED",
  };

  return { teams: normalizedTeams, comparison };
}

export default function SessionPage() {
  const router = useRouter();
  const routeParams = useParams<{ slug: string }>();
  const slug = Array.isArray(routeParams?.slug) ? routeParams.slug[0] : routeParams?.slug;

  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayer[]>([]);
  const [sessionTeams, setSessionTeams] = useState<SessionTeam[]>([]);
  const [generatedTeams, setGeneratedTeams] = useState<GeneratedTeam[]>([]);
  const [teamComparison, setTeamComparison] = useState<TeamComparison | null>(null);
  const [sessionBracket, setSessionBracket] = useState<SessionBracket | null>(null);
  const [workflow, setWorkflow] = useState<SessionWorkflow | null>(null);
  const [sessionLive, setSessionLive] = useState<SessionLiveState | null>(null);
  const [sessionHighlights, setSessionHighlights] = useState<SessionHighlights | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [teamCount, setTeamCount] = useState("4");
  const [teamSize, setTeamSize] = useState("");
  const [generationMode, setGenerationMode] = useState("BALANCED");
  const [loading, setLoading] = useState(true);
  const [closingSession, setClosingSession] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [savingPresenceId, setSavingPresenceId] = useState("");
  const [selectingAll, setSelectingAll] = useState(false);
  const [movingPlayerId, setMovingPlayerId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasNoLeague, setHasNoLeague] = useState(false);

  const sessionPlayerByPlayerId = useMemo(
    () => new Map(sessionPlayers.map((item) => [item.player_id, item])),
    [sessionPlayers],
  );
  const confirmedSessionPlayerIds = useMemo(
    () => new Set(sessionPlayers.filter((item) => item.is_confirmed).map((item) => item.player_id)),
    [sessionPlayers],
  );

  const availablePlayers = useMemo(() => players.filter((player) => player.is_active), [players]);
  const selectedSession = useMemo(() => sessions.find((item) => item.id === selectedSessionId) ?? null, [sessions, selectedSessionId]);
  const confirmedCount = useMemo(() => sessionPlayers.filter((item) => item.is_confirmed).length, [sessionPlayers]);
  const strengthRange = useMemo(() => getTeamStrengthRange(generatedTeams), [generatedTeams]);
  const sessionLocked = selectedSession?.status === "FINISHED";
  const canCloseSession = Boolean(workflow?.can_finalize) && !sessionLocked;
  const canGenerateTeams = !sessionLocked && Boolean(workflow?.ready_for_draw) && (sessionBracket?.matches.length ?? 0) === 0;

  async function refreshSessionData(leagueId: string, sessionId: string, roster: Player[] = players) {
    const token = getToken();
    if (!token || !sessionId) {
      return;
    }

    const [playersInSession, sessionTeams, liveState, workflowState, bracket] = await Promise.all([
      apiRequest<SessionPlayer[]>(`/leagues/${leagueId}/sessions/${sessionId}/players`, { token }),
      apiRequest<SessionTeam[]>(`/leagues/${leagueId}/sessions/${sessionId}/teams`, { token }),
      apiRequest<SessionLiveState>(`/leagues/${leagueId}/matches/session/${sessionId}/live`, { token }),
      apiRequest<SessionWorkflow>(`/leagues/${leagueId}/sessions/${sessionId}/workflow`, { token }),
      apiRequest<SessionBracket>(`/leagues/${leagueId}/sessions/${sessionId}/matches`, { token }),
    ]);

    const teamPlayerGroups = sessionTeams.length
      ? await Promise.all(
          sessionTeams.map((team) =>
            apiRequest<SessionTeamPlayer[]>(`/leagues/${leagueId}/sessions/${sessionId}/teams/${team.id}/players`, { token }),
          ),
        )
      : [];
    const teamPlayers = teamPlayerGroups.flat();
    const built = buildGeneratedTeamsFromAssignments(sessionTeams, teamPlayers, roster);

    setSessionPlayers(playersInSession);
    setSessionTeams(sessionTeams);
    setWorkflow(workflowState);
    setSessionBracket(bracket);
    setSessionLive(liveState);
    setSessions((currentSessions) => currentSessions.map((item) => (item.id === sessionId ? liveState.session : item)));
    setGeneratedTeams(built.teams);
    setTeamComparison(built.comparison);

    try {
      const highlights = await apiRequest<SessionHighlights>(`/leagues/${leagueId}/sessions/${sessionId}/highlights`, { token });
      setSessionHighlights(highlights);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 404) {
        setSessionHighlights(null);
      } else {
        throw loadError;
      }
    }

    try {
      const summary = await apiRequest<SessionSummary>(`/leagues/${leagueId}/sessions/${sessionId}/summary`, { token });
      setSessionSummary(summary);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 404) {
        setSessionSummary(null);
      } else {
        throw loadError;
      }
    }
  }

  async function loadBaseData() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!slug) {
      throw new Error("Liga nao encontrada na rota atual.");
    }

    const resolvedLeague = await getLeagueBySlug(token, slug);
    if (!resolvedLeague) {
      setHasNoLeague(true);
      setLeague(null);
      setPlayers([]);
      setSessions([]);
      setSelectedSessionId("");
      setSessionPlayers([]);
      setGeneratedTeams([]);
      setTeamComparison(null);
      setSessionBracket(null);
      setWorkflow(null);
      setSessionLive(null);
      setSessionHighlights(null);
      setSessionSummary(null);
      setError("");
      setSuccess("");
      return;
    }
    const [leaguePlayers, leagueSessions] = await Promise.all([
      apiRequest<Player[]>(`/leagues/${resolvedLeague.id}/players`, { token }),
      apiRequest<SessionItem[]>(`/leagues/${resolvedLeague.id}/sessions`, { token }),
    ]);

    setHasNoLeague(false);
    setLeague(resolvedLeague);
    setPlayers(leaguePlayers);
    setSessions(leagueSessions);

    const currentSessionId = selectedSessionId || leagueSessions[0]?.id || "";
    setSelectedSessionId(currentSessionId);

    const currentSession = leagueSessions.find((item) => item.id === currentSessionId) ?? leagueSessions[0] ?? null;
    if (currentSession) {
      setTeamCount(String(currentSession.team_count));
      setTeamSize(currentSession.team_size ? String(currentSession.team_size) : "");
    }

    if (currentSessionId) {
      await refreshSessionData(resolvedLeague.id, currentSessionId, leaguePlayers);
    }
  }

  useEffect(() => {
    void loadBaseData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Erro ao carregar rodada."))
      .finally(() => setLoading(false));
  }, [router, slug]);

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token || !league) {
      setError("Crie ou entre em uma liga antes de abrir a primeira rodada.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await apiRequest<SessionItem>(`/leagues/${league.id}/sessions`, {
        method: "POST",
        token,
        body: {
          title,
          location: location || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          team_count: Number(teamCount),
          team_size: teamSize ? Number(teamSize) : null,
        },
      });
      setTitle("");
      setLocation("");
      setScheduledAt("");
      setTeamCount("4");
      setTeamSize("");
      setSuccess("Rodada criada com sucesso.");
      await loadBaseData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel criar a rodada.");
    }
  }

  async function handlePresenceToggle(playerId: string, checked: boolean) {
    const token = getToken();
    if (!token || !league || !selectedSessionId) {
      return;
    }

    // Optimistic update — elimina o flicker atualizando o estado antes da API responder
    setSessionPlayers((prev) => {
      const existing = prev.find((p) => p.player_id === playerId);
      if (existing) {
        return prev.map((p) =>
          p.player_id === playerId
            ? { ...p, is_confirmed: checked, attendance_status: checked ? "CONFIRMED" : "PENDING" }
            : p,
        );
      }
      return prev;
    });

    try {
      setError("");
      setSuccess("");
      setSavingPresenceId(playerId);
      const existingSessionPlayer = sessionPlayerByPlayerId.get(playerId);

      if (checked && !existingSessionPlayer) {
        try {
          await apiRequest<SessionPlayer>(`/leagues/${league.id}/sessions/${selectedSessionId}/players`, {
            method: "POST",
            token,
            body: {
              player_id: playerId,
              is_confirmed: true,
              attendance_status: "CONFIRMED",
            },
          });
        } catch (submissionError) {
          if (submissionError instanceof ApiError && submissionError.status === 400 && submissionError.message.includes("already registered")) {
            await refreshSessionData(league.id, selectedSessionId);
            setSuccess("Presenca sincronizada com a sessao.");
            return;
          }
          throw submissionError;
        }
      }

      if (checked && existingSessionPlayer && !existingSessionPlayer.is_confirmed) {
        await apiRequest<SessionPlayer>(`/leagues/${league.id}/sessions/${selectedSessionId}/players/${existingSessionPlayer.id}`, {
          method: "PATCH",
          token,
          body: {
            is_confirmed: true,
            attendance_status: "CONFIRMED",
          },
        });
      }

      if (!checked && existingSessionPlayer?.is_confirmed) {
        await apiRequest<SessionPlayer>(`/leagues/${league.id}/sessions/${selectedSessionId}/players/${existingSessionPlayer.id}`, {
          method: "PATCH",
          token,
          body: {
            is_confirmed: false,
            attendance_status: "PENDING",
          },
        });
      }

      await refreshSessionData(league.id, selectedSessionId);
      setSuccess("Presenca atualizada.");
    } catch (submissionError) {
      // Reverte o optimistic update em caso de erro
      await refreshSessionData(league.id, selectedSessionId);
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel atualizar a presenca.");
    } finally {
      setSavingPresenceId("");
    }
  }

  async function handleSelectAll() {
    const token = getToken();
    if (!token || !league || !selectedSessionId || sessionLocked) return;

    const unconfirmed = availablePlayers.filter((p) => !confirmedSessionPlayerIds.has(p.id));
    if (unconfirmed.length === 0) return;

    setSelectingAll(true);
    setError("");
    setSuccess("");

    // Optimistic update para todos de uma vez
    setSessionPlayers((prev) => {
      const prevIds = new Set(prev.map((p) => p.player_id));
      const updated = prev.map((p) =>
        unconfirmed.some((u) => u.id === p.player_id)
          ? { ...p, is_confirmed: true, attendance_status: "CONFIRMED" }
          : p,
      );
      const newEntries = unconfirmed
        .filter((u) => !prevIds.has(u.id))
        .map((u) => ({ player_id: u.id, is_confirmed: true, attendance_status: "CONFIRMED" } as SessionPlayer));
      return [...updated, ...newEntries];
    });

    try {
      await Promise.all(
        unconfirmed.map(async (player) => {
          const existing = sessionPlayerByPlayerId.get(player.id);
          if (!existing) {
            try {
              await apiRequest<SessionPlayer>(`/leagues/${league.id}/sessions/${selectedSessionId}/players`, {
                method: "POST",
                token,
                body: { player_id: player.id, is_confirmed: true, attendance_status: "CONFIRMED" },
              });
            } catch (err) {
              if (!(err instanceof ApiError && err.status === 400)) throw err;
            }
          } else if (!existing.is_confirmed) {
            await apiRequest<SessionPlayer>(`/leagues/${league.id}/sessions/${selectedSessionId}/players/${existing.id}`, {
              method: "PATCH",
              token,
              body: { is_confirmed: true, attendance_status: "CONFIRMED" },
            });
          }
        }),
      );
      await refreshSessionData(league.id, selectedSessionId);
      setSuccess("Todos os atletas confirmados.");
    } catch (err) {
      await refreshSessionData(league.id, selectedSessionId);
      setError(err instanceof Error ? err.message : "Erro ao confirmar todos os atletas.");
    } finally {
      setSelectingAll(false);
    }
  }

  async function handleGenerateTeams(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token || !league || !selectedSessionId) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      const response = await apiRequest<TeamGenerationResponse>(`/leagues/${league.id}/sessions/${selectedSessionId}/generate-teams`, {
        method: "POST",
        token,
        body: {
          team_count: Number(teamCount),
          mode: generationMode,
        },
      });
      await refreshSessionData(league.id, selectedSessionId);
      setGeneratedTeams(response.teams);
      setTeamComparison(response.comparison);
      setSuccess("Sorteio concluido com stats e confrontos automaticos.");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel gerar os times.");
    }
  }

  async function handleMovePlayer(playerId: string, targetTeamId: string) {
    const token = getToken();
    if (!token || !league || !selectedSessionId) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      setMovingPlayerId(playerId);
      await apiRequest(`/leagues/${league.id}/sessions/${selectedSessionId}/teams/move-player`, {
        method: "POST",
        token,
        body: {
          player_id: playerId,
          target_team_id: targetTeamId,
          make_captain: false,
        },
      });
      await refreshSessionData(league.id, selectedSessionId);
      setSuccess("Jogador realocado entre os times.");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel mover o jogador.");
    } finally {
      setMovingPlayerId("");
    }
  }

  async function handleFinalizeSession() {
    const token = getToken();
    if (!token || !league || !selectedSessionId) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      setClosingSession(true);
      const summary = await apiRequest<SessionFinalizeSummary>(`/leagues/${league.id}/sessions/${selectedSessionId}/close`, {
        method: "POST",
        token,
      });
      await refreshSessionData(league.id, selectedSessionId);
      setSessionHighlights(summary.highlights);
      setSessionSummary(summary.summary);
      setShowFinalizeDialog(false);
      setSuccess(
        `Sessao encerrada com ${summary.matches_finished} partidas consolidadas, ${summary.matches_locked} bloqueadas e ${summary.total_goals} gols.${
          summary.summary?.best_player?.player_name ? ` MVP da rodada: ${summary.summary.best_player.player_name}.` : ""
        }`,
      );
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel consolidar a rodada.");
    } finally {
      setClosingSession(false);
    }
  }

  async function handleSelectSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    if (!league) {
      return;
    }
    try {
      const nextSession = sessions.find((item) => item.id === sessionId);
      if (nextSession) {
        setTeamCount(String(nextSession.team_count));
        setTeamSize(nextSession.team_size ? String(nextSession.team_size) : "");
      }
      await refreshSessionData(league.id, sessionId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao trocar de rodada.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-60 rounded-[28px]" />
        <SkeletonCard className="h-96 rounded-[28px]" />
      </div>
    );
  }

  if (hasNoLeague) {
    return <EmptyLeagueState />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rodada premium"
        title="Sorteio guiado por stats, chave automatica e leitura esportiva forte."
        description="A sessao agora funciona como central de balanceamento real: atletas com atributos em destaque, comparativo de forca entre times e confrontos conectados automaticamente."
        stats={
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Sessoes</p><strong className="mt-2 block text-xl text-white">{sessions.length}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Confirmados</p><strong className="mt-2 block text-xl text-white">{confirmedCount}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Times</p><strong className="mt-2 block text-xl text-white">{generatedTeams.length}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Jogos</p><strong className="mt-2 block text-xl text-white">{sessionBracket?.matches.length ?? 0}</strong></div>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href={`/league/${league?.slug ?? ""}/match`} className="btn-primary">Iniciar</Link>
            {canCloseSession ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300/20 bg-[linear-gradient(135deg,rgba(251,113,133,0.16),rgba(190,24,93,0.1))] px-5 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-200/35 hover:bg-[linear-gradient(135deg,rgba(251,113,133,0.24),rgba(190,24,93,0.16))]"
                onClick={() => setShowFinalizeDialog(true)}
              >
                Encerrar
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {success ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="page-card">
          <SectionHeader eyebrow="Nova rodada" title="Abrir sessao operacional" description="Quatro times, balanceamento por stats e chave pronta para escalar no mesmo fluxo." />
          <form className="mt-6 space-y-4" onSubmit={handleCreateSession}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Titulo</label>
              <input className="input-shell w-full" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Baba de quinta premium" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Data e hora</label>
              <input className="input-shell w-full" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Local</label>
              <input className="input-shell w-full" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Arena central" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Times</label>
                <select className="input-shell w-full" value={teamCount} onChange={(event) => setTeamCount(event.target.value)}>
                  <option value="2">2 times</option>
                  <option value="3">3 times</option>
                  <option value="4">4 times</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Tamanho</label>
                <input className="input-shell w-full" type="number" min="1" value={teamSize} onChange={(event) => setTeamSize(event.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">Criar rodada</button>
          </form>
        </div>

        <div className="page-card">
          <SectionHeader eyebrow="Agenda da liga" title="Rodadas disponiveis" description="Cada card posiciona a sessao como um evento esportivo com setup, live e fechamento." />
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sessions.length ? (
              sessions.map((session) => (
                <button key={session.id} type="button" className="text-left" onClick={() => void handleSelectSession(session.id)}>
                  <div className={`h-full ${selectedSessionId === session.id ? "ring-1 ring-cyan-300/25" : ""}`}>
                    <SessionCard session={session} />
                  </div>
                </button>
              ))
            ) : (
              <EmptyState title="Nenhuma sessao ainda" description="Crie a primeira rodada para liberar o sorteio guiado por stats e o fluxo automatico de confrontos." />
            )}
          </div>
        </div>
      </section>

      {selectedSession ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <div className="page-card">
              <SectionHeader
                eyebrow="Cabine da rodada"
                title={selectedSession.title}
                description="Painel de balanceamento com leitura de forca, feed curto da sessao e acesso direto aos confrontos."
                action={<StatusBadge tone={getStatusTone(selectedSession.status)}>{selectedSession.status}</StatusBadge>}
              />
              {sessionLocked ? (
                <div className="mt-5 rounded-[24px] border border-amber-300/18 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.05))] px-5 py-4 text-sm text-amber-100">
                  Sessao encerrada. A rodada foi congelada, novos jogos e eventos estao bloqueados e os destaques finais abaixo passam a valer como quadro oficial.
                </div>
              ) : null}
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="surface-elevated p-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-100">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Motor de balanceamento</p>
                      <strong className="mt-2 block text-white">{teamComparison ? getBalanceLabel(teamComparison.balance_state) : "Aguardando sorteio"}</strong>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-[--color-text-400]">{getComparisonHeadline(teamComparison, generatedTeams)}</p>
                </div>
                <div className="surface-elevated p-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                      <Shield className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Gap de forca</p>
                      <strong className="mt-2 block text-white">{teamComparison?.strength_gap ?? 0} pts</strong>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-[--color-text-400]">A media de referencia da sessao esta em {teamComparison?.average_strength ?? 0} pontos.</p>
                </div>
                <div className="surface-elevated p-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Swords className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Confrontos</p>
                      <strong className="mt-2 block text-white">{sessionBracket?.matches.length ?? 0} jogos montados</strong>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-[--color-text-400]">As vagas de final e perdedores ficam amarradas automaticamente ao resultado das semifinais.</p>
                </div>
              </div>
            </div>

            <div className="page-card">
              <SectionHeader eyebrow="Sorteio" title="Gerar times com foco total nas stats" description="Ataque, passe, defesa e folego influenciam a forca final. O nivel segue como ancora do balanceamento." />
              <form className="mt-6 space-y-4" onSubmit={handleGenerateTeams}>
                <div className="surface-elevated p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Confirmados</p>
                      <strong className="mt-2 block text-3xl text-white">{confirmedCount}</strong>
                    </div>
                    <StatusBadge tone={teamComparison ? getBalanceTone(teamComparison.balance_state) : "neutral"}>
                      {teamComparison ? getBalanceLabel(teamComparison.balance_state) : "Sem sorteio"}
                    </StatusBadge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Quantidade de times</label>
                  <select className="input-shell w-full" value={teamCount} onChange={(event) => setTeamCount(event.target.value)}>
                    <option value="2">2 times</option>
                    <option value="3">3 times</option>
                    <option value="4">4 times</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Modo de sorteio</label>
                  <select className="input-shell w-full" value={generationMode} onChange={(event) => setGenerationMode(event.target.value)}>
                    <option value="BALANCED">Balanceado por stats</option>
                    <option value="RANDOM">Aleatorio</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary mt-2 w-full" disabled={!canGenerateTeams}>
                  <Sparkles className="h-4 w-4" />
                  Sortear times e confrontos
                </button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link href={`/league/${league?.slug ?? ""}/match`} className="btn-primary w-full text-center">
                    Iniciar
                  </Link>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-300/20 bg-[linear-gradient(135deg,rgba(251,113,133,0.16),rgba(190,24,93,0.1))] px-5 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-200/35 hover:bg-[linear-gradient(135deg,rgba(251,113,133,0.24),rgba(190,24,93,0.16))] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => setShowFinalizeDialog(true)}
                    disabled={!canCloseSession || closingSession}
                  >
                    Encerrar
                  </button>
                </div>
                {sessionLocked ? <p className="text-sm text-[--color-text-400]">Sessao encerrada. Times, jogos e operacao live estao bloqueados.</p> : null}
                {!sessionLocked && !workflow?.ready_for_draw ? (
                  <p className="text-sm text-[--color-text-400]">Confirme atletas suficientes para bater a quantidade de times antes de sortear.</p>
                ) : null}
                {!sessionLocked && (sessionBracket?.matches.length ?? 0) > 0 ? (
                  <p className="text-sm text-[--color-text-400]">Os confrontos desta sessao ja foram gerados. Abra outra rodada para fazer um novo sorteio.</p>
                ) : null}
                {canCloseSession && workflow?.has_open_matches ? (
                  <p className="text-sm text-[--color-text-400]">Ao encerrar agora, partidas pendentes serao bloqueadas e apenas os resultados ja registrados entrarao na consolidacao final.</p>
                ) : null}
              </form>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="page-card">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader eyebrow="Presenca" title="Atletas disponiveis" description="Os jogadores entram na rodada com leitura forte de funcao e prontidao." />
                {!sessionLocked && availablePlayers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleSelectAll()}
                    disabled={selectingAll || confirmedSessionPlayerIds.size === availablePlayers.length}
                    className="shrink-0 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {selectingAll ? "Confirmando..." : "Selecionar todos"}
                  </button>
                )}
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {availablePlayers.map((player) => {
                  const checked = confirmedSessionPlayerIds.has(player.id);
                  return (
                    <label key={player.id} className={`surface-soft flex cursor-pointer items-center justify-between gap-4 p-4 ${checked ? "ring-1 ring-emerald-400/25" : ""}`}>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{player.name}</p>
                        <p className="text-sm text-[--color-text-400]">overall {deriveOverall(player)} • nivel {player.skill_level}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {checked ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Users className="h-5 w-5 text-[--color-text-400]" />}
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald-500"
                          checked={checked}
                          disabled={savingPresenceId === player.id || sessionLocked}
                          onChange={(event) => void handlePresenceToggle(player.id, event.target.checked)}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="page-card">
              <SectionHeader eyebrow="Leitura de forca" title="Comparativo dos times" description="Cards desenhados para deixar claro como cada elenco foi montado e qual o peso de cada atleta." />
              {sessionTeams.length > 1 ? (
                <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[--color-text-300]">
                  Os confrontos continuam automaticos, mas voce pode ajustar um atleta entre os times antes do primeiro jogo comecar.
                </div>
              ) : null}
              <div className="mt-6 space-y-4">
                {generatedTeams.length ? (
                  generatedTeams.map((team) => (
                    <TeamStrengthCard
                      key={team.team_id}
                      team={team}
                      strongestValue={strengthRange.max}
                      editable={!sessionLocked && (sessionBracket?.matches.every((match) => match.status === "SCHEDULED") ?? true)}
                      teamOptions={sessionTeams.map((sessionTeam) => ({ id: sessionTeam.id, name: sessionTeam.name }))}
                      movingPlayerId={movingPlayerId}
                      onMovePlayer={(playerId, targetTeamId) => void handleMovePlayer(playerId, targetTeamId)}
                    />
                  ))
                ) : (
                  <EmptyState title="Sem sorteio gerado" description="Confirme os atletas e rode o motor balanceado para revelar a forca dos elencos." />
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}

      <section className="page-card">
        <SectionHeader eyebrow="Vitrine de atributos" title="Elenco com destaque total para stats" description="Os atributos principais ja aparecem em formato de scouting para reforcar que o sorteio considera qualidade e perfil tecnico." />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {availablePlayers.slice(0, 8).map((player) => <PlayerStatCard key={player.id} player={player} />)}
        </div>
      </section>

      {sessionBracket?.matches.length && league ? (
        <div className="page-card">
          <SectionHeader eyebrow="Bracket da sessao" title="Vencedores e perdedores conectados automaticamente" description="A rodada nasce com a narrativa inteira: semifinais, final principal e final da chave secundaria." />
          <div className="mt-6">
            <SessionBracketView bracket={sessionBracket} leagueSlug={league.slug} />
          </div>
        </div>
      ) : null}

      {sessionSummary ? <SessionFinalSummary summary={sessionSummary} /> : null}
      {sessionHighlights ? <RoundHighlightsPanel highlights={sessionHighlights} title={sessionLocked ? "Premiacao oficial da sessao encerrada" : undefined} /> : null}

      {sessionLive?.recent_events.length ? (
        <section className="page-card">
          <SectionHeader eyebrow="Feed da rodada" title="Ultimos eventos capturados" description="Resumo rapido da operacao para acompanhar a sessao sem sair do painel." />
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sessionLive.recent_events.slice(0, 4).map((event) => (
              <div key={event.id} className="surface-elevated p-5">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge tone="info">{event.event_type}</StatusBadge>
                  <span className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">{event.minute}'</span>
                </div>
                <p className="mt-4 text-base font-semibold text-white">{event.player_name ?? "Evento geral"}</p>
                <p className="mt-2 text-sm text-[--color-text-400]">{event.team_name ?? "Rodada"} • {event.notes ?? "Atualizacao operacional"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ConfirmationDialog
        open={showFinalizeDialog}
        eyebrow="Encerramento da rodada"
        tone="danger"
        title="Encerrar sessao"
        description="Deseja encerrar esta sessão? Isso vai finalizar a rodada atual e calcular automaticamente os destaques do Baba."
        confirmLabel="Confirmar encerramento"
        busyLabel="Encerrando e calculando..."
        busy={closingSession}
        onConfirm={() => void handleFinalizeSession()}
        onCancel={() => setShowFinalizeDialog(false)}
        icon={<Trophy className="h-6 w-6" />}
      />
    </div>
  );
}
