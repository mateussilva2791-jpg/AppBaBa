"use client";

import Link from "next/link";
import { Activity, BarChart3, ChevronRight, Medal, Shield, Trophy, Users, Waves } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { LeagueLoadError } from "@/components/league/league-load-error";
import { LeagueSkeleton } from "@/components/league/league-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RankingRow } from "@/components/ui/ranking-row";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { SessionCard } from "@/components/ui/session-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiRequest } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { useActiveLeague } from "@/hooks/useActiveLeague";
import { getStatusTone } from "@/lib/ui";
import type {
  FeatureAccess, League, Player, RankingEntry, SessionItem, SessionLiveState,
} from "@/lib/types";

type DashboardState = {
  league: League;
  players: Player[];
  sessions: SessionItem[];
  ranking: RankingEntry[];
  features: FeatureAccess;
  sessionLive: SessionLiveState | null;
};

const QUICK_ACTIONS = [
  {
    href: "session",
    label: "Montar rodada",
    desc: "Sorteio e chaveamento",
    icon: Waves,
    accent: "rgba(96,165,250,0.14)",
    iconColor: "text-sky-300",
  },
  {
    href: "match",
    label: "Operar ao vivo",
    desc: "Feed e placar em tempo real",
    icon: Trophy,
    accent: "rgba(240,180,41,0.12)",
    iconColor: "text-[--color-accent-gold]",
  },
  {
    href: "ranking",
    label: "Ver ranking",
    desc: "Classificacao e destaques",
    icon: Medal,
    accent: "rgba(74,222,128,0.12)",
    iconColor: "text-emerald-300",
  },
  {
    href: "players",
    label: "Gerir elenco",
    desc: "Jogadores e posicoes",
    icon: Users,
    accent: "rgba(248,113,113,0.1)",
    iconColor: "text-red-300",
  },
] as const;

const QUICK_DELAYS = [0, 100, 200, 300] as const;

export default function LeagueDashboard() {
  const router = useRouter();
  const routeParams = useParams<{ slug: string }>();
  const slug = Array.isArray(routeParams?.slug) ? routeParams.slug[0] : routeParams?.slug;

  const {
    league,
    loading: leagueLoading,
    error: leagueError,
    isEmpty,
    refetch: refetchLeague,
    auth,
  } = useActiveLeague({ requestedLeagueSlug: slug });

  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const token = auth.token ?? getToken();
      if (!token || !league) {
        router.replace("/login");
        return;
      }

      const [players, sessions, ranking, features] = await Promise.all([
        apiRequest<Player[]>(`/leagues/${league.id}/players`, { token }),
        apiRequest<SessionItem[]>(`/leagues/${league.id}/sessions`, { token }),
        apiRequest<RankingEntry[]>(`/leagues/${league.id}/ranking`, { token }),
        apiRequest<FeatureAccess>(`/billing/leagues/${league.id}/features`, { token }),
      ]);

      const nextSession = sessions[0];
      const sessionLive = nextSession
        ? await apiRequest<SessionLiveState>(
            `/leagues/${league.id}/matches/session/${nextSession.id}/live`,
            { token },
          )
        : null;

      if (!active) return;
      setState({ league, players, sessions, ranking, features, sessionLive });
    }

    if (leagueLoading) return;

    if (leagueError || isEmpty || !league) {
      setLoading(false);
      setState(null);
      return;
    }

    setLoading(true);
    setError("");
    void loadDashboard()
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar a liga.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth.token, isEmpty, league, leagueError, leagueLoading, reloadKey, router]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  const podium = useMemo(() => state?.ranking.slice(0, 3) ?? [], [state?.ranking]);
  const maxPoints = useMemo(() => state?.ranking[0]?.ranking_points ?? 0, [state?.ranking]);
  const nextSession = state?.sessions[0];
  const totalEvents = state?.sessionLive?.recent_events.length ?? 0;
  const totalMatches = state?.sessionLive?.matches.length ?? 0;

  if (leagueLoading || loading) return <LeagueSkeleton />;
  if (leagueError) return <LeagueLoadError message={leagueError} onRetry={refetchLeague} />;
  if (isEmpty) return <EmptyLeagueState />;
  if (error || !state) {
    return (
      <LeagueLoadError
        message={error || "Tente atualizar a pagina para buscar o dashboard novamente."}
        onRetry={() => {
          refetchLeague();
          setReloadKey((c) => c + 1);
        }}
      />
    );
  }

  const headerStats = [
    { label: "Plano", value: state.features.plan },
    { label: "Jogadores", value: state.players.length },
    { label: "Partidas", value: totalMatches },
    { label: "Eventos", value: totalEvents },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Central da liga"
        title={state.league.name}
        description="Painel operacional - rodada, ranking e acesso rapido em uma tela."
        stats={
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {headerStats.map((s) => (
              <div key={s.label} className="stat-row-item">
                <span className="stat-row-label">{s.label}</span>
                <span className="stat-row-value">{s.value}</span>
              </div>
            ))}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href={`/league/${state.league.slug}/session`} className="btn-primary">
              Abrir rodada
            </Link>
            <button type="button" className="btn-ghost" onClick={handleLogout}>
              Sair
            </button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <Reveal>
          <section className="page-card h-full">
            <SectionHeader
              eyebrow="Rodada"
              title="Proxima sessao"
              description="A rodada e o elemento central do produto."
              action={
                nextSession ? (
                  <StatusBadge tone={getStatusTone(nextSession.status)}>
                    {nextSession.status}
                  </StatusBadge>
                ) : null
              }
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              {nextSession ? (
                <>
                  <SessionCard
                    session={nextSession}
                    href={`/league/${state.league.slug}/session`}
                    actionLabel="Ver rodada"
                  />

                  <div className="surface-soft flex flex-col gap-4 p-5">
                    <div>
                      <p className="label-section mb-3">Status atual</p>
                      <strong className="metric-card-value text-[1.6rem]">{totalMatches}</strong>
                      <span className="metric-card-sub">partidas criadas</span>
                    </div>

                    <div className="gradient-divider" />

                    <div>
                      <p className="label-section mb-2">Feed</p>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[--color-accent-primary]" />
                        <strong className="text-lg font-bold text-[--color-text-primary]">
                          {totalEvents}
                        </strong>
                        <span className="text-xs text-[--color-text-muted]">eventos</span>
                      </div>
                      {!totalEvents && (
                        <p className="mt-1.5 text-xs leading-5 text-[--color-text-muted]">
                          Nenhum evento registrado ainda.
                        </p>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col gap-2">
                      <Link
                        href={`/league/${state.league.slug}/match`}
                        className="btn-secondary text-center"
                      >
                        Ir para ao vivo
                      </Link>
                      <Link
                        href={`/league/${state.league.slug}/ranking`}
                        className="btn-ghost text-center"
                      >
                        Ver classificacao
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-full">
                  <EmptyState
                    title="Nenhuma rodada criada."
                    description="Crie a primeira sessao para ativar sorteio, chaveamento e operacao live."
                    action={
                      <Link href={`/league/${state.league.slug}/session`} className="btn-primary">
                        Criar rodada
                      </Link>
                    }
                  />
                </div>
              )}
            </div>
          </section>
        </Reveal>

        <Reveal delay={100}>
          <section className="page-card h-full">
            <SectionHeader
              eyebrow="Ranking"
              title="Top da liga"
              action={
                <Link
                  href={`/league/${state.league.slug}/ranking`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[--color-text-muted] transition-colors hover:text-[--color-accent-primary]"
                >
                  Ver tudo
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
            />

            <div className="mt-5 space-y-2">
              {podium.length ? (
                podium.map((entry, i) => (
                  <RankingRow key={entry.id} entry={entry} index={i} maxPoints={maxPoints} />
                ))
              ) : (
                <EmptyState
                  title="Ranking vazio"
                  description="Finalize uma partida para revelar os primeiros destaques."
                />
              )}
            </div>
          </section>
        </Reveal>
      </div>

      <Reveal delay={200}>
        <section className="page-card">
          <SectionHeader eyebrow="Acesso rapido" title="O que voce quer fazer agora?" />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              const delay = QUICK_DELAYS[i];
              return (
                <Reveal key={action.href} delay={delay}>
                  <Link
                    href={`/league/${state.league.slug}/${action.href}`}
                    className="quick-action-card"
                  >
                    <div>
                      <p className="text-[15px] font-semibold text-[--color-text-primary]">
                        {action.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[--color-text-muted]">{action.desc}</p>
                    </div>
                    <span
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${action.iconColor}`}
                      style={{ background: action.accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal delay={300}>
        <section className="grid gap-4 sm:grid-cols-3">
          <Link
            href={`/league/${state.league.slug}/stats`}
            className="card-glow flex items-center justify-between gap-4 p-5"
          >
            <div>
              <p className="label-section mb-2">Estatisticas</p>
              <p className="text-sm text-[--color-text-secondary]">
                Analise completa de desempenho dos jogadores
              </p>
            </div>
            <BarChart3 className="h-8 w-8 shrink-0 text-[--color-accent-gold] opacity-60" />
          </Link>

          <Link
            href={`/league/${state.league.slug}/players`}
            className="card-glow flex items-center justify-between gap-4 p-5"
          >
            <div>
              <p className="label-section mb-2">Elenco</p>
              <p className="text-sm text-[--color-text-secondary]">
                {state.players.length} jogadores cadastrados na liga
              </p>
            </div>
            <Users className="h-8 w-8 shrink-0 text-sky-300 opacity-60" />
          </Link>

          <Link
            href={`/league/${state.league.slug}/admin`}
            className="card-glow flex items-center justify-between gap-4 p-5"
          >
            <div>
              <p className="label-section mb-2">Administracao</p>
              <p className="text-sm text-[--color-text-secondary]">
                Configuracoes e permissoes da liga
              </p>
            </div>
            <Shield className="h-8 w-8 shrink-0 text-emerald-300 opacity-60" />
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
