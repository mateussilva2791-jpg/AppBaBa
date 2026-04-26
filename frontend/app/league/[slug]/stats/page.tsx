"use client";

import { BarChart3, Goal, ShieldAlert, Sparkles, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { RoundHighlightsPanel } from "@/components/session/round-highlights-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RankingRow } from "@/components/ui/ranking-row";
import { SectionHeader } from "@/components/ui/section-header";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ApiError, apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getLeagueBySlug } from "@/lib/league";
import type { League, MatchItem, Player, RankingEntry, SessionHighlights, SessionItem } from "@/lib/types";


export default function StatsPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [latestHighlights, setLatestHighlights] = useState<SessionHighlights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasNoLeague, setHasNoLeague] = useState(false);

  useEffect(() => {
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
        setPlayers([]);
        setRanking([]);
        setMatches([]);
        setSessions([]);
        return;
      }
      const [playersData, rankingData, matchesData, sessionsData] = await Promise.all([
        apiRequest<Player[]>(`/leagues/${resolvedLeague.id}/players`, { token }),
        apiRequest<RankingEntry[]>(`/leagues/${resolvedLeague.id}/ranking`, { token }),
        apiRequest<MatchItem[]>(`/leagues/${resolvedLeague.id}/matches`, { token }),
        apiRequest<SessionItem[]>(`/leagues/${resolvedLeague.id}/sessions`, { token }),
      ]);
      setHasNoLeague(false);
      setLeague(resolvedLeague);
      setPlayers(playersData);
      setRanking(rankingData);
      setMatches(matchesData);
      setSessions(sessionsData);
      try {
        const latest = await apiRequest<SessionHighlights>(`/leagues/${resolvedLeague.id}/ranking/highlights/latest`, { token });
        setLatestHighlights(latest);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 404) {
          setLatestHighlights(null);
        } else {
          throw loadError;
        }
      }
    }

    void loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Erro ao carregar estatisticas."))
      .finally(() => setLoading(false));
  }, [params, router]);

  const leaders = useMemo(() => {
    return {
      topGoals: [...ranking].sort((a, b) => b.goals - a.goals).slice(0, 5),
      topAssists: [...ranking].sort((a, b) => b.assists - a.assists).slice(0, 5),
      topDefense: [...ranking].sort((a, b) => b.clean_sheets - a.clean_sheets).slice(0, 5),
    };
  }, [ranking]);

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estatisticas"
        title="Leitura analitica simples, clara e pronta para evoluir."
        description="Os cards e rankings ja deixam o frontend preparado para analises futuras por rodada, acumulado e aproveitamento."
        stats={
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Liga</p><strong className="mt-2 block text-lg text-white">{league?.name ?? "-"}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Jogadores</p><strong className="mt-2 block text-lg text-white">{players.length}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Rodadas</p><strong className="mt-2 block text-lg text-white">{sessions.length}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Partidas</p><strong className="mt-2 block text-lg text-white">{matches.length}</strong></div>
          </div>
        }
      />

      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-6">
        {[
          { icon: Goal, label: "Gols totais", value: ranking.reduce((sum, item) => sum + item.goals, 0) },
          { icon: TrendingUp, label: "Assistencias", value: ranking.reduce((sum, item) => sum + item.assists, 0) },
          { icon: ShieldAlert, label: "Faltas", value: ranking.reduce((sum, item) => sum + item.fouls, 0) },
          { icon: ShieldAlert, label: "Cartoes", value: ranking.reduce((sum, item) => sum + item.yellow_cards + item.red_cards, 0) },
          { icon: ShieldAlert, label: "Clean sheets", value: ranking.reduce((sum, item) => sum + item.clean_sheets, 0) },
          { icon: Users, label: "Presencas", value: ranking.reduce((sum, item) => sum + item.attendances, 0) },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="page-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">{item.label}</p>
                  <strong className="mt-3 block text-3xl text-white">{item.value}</strong>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/12 text-sky-200">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="page-card">
          <SectionHeader eyebrow="Artilharia" title="Lideres em gols" />
          <div className="mt-6 space-y-3">
            {leaders.topGoals.length ? leaders.topGoals.map((entry, index) => (
              <RankingRow
                key={entry.id}
                entry={entry}
                index={index}
                highlightState={{
                  isBestPlayer: (latestHighlights?.best_average_player?.player_id ?? latestHighlights?.best_player?.player_id) === entry.player_id,
                  isTopScorer: latestHighlights?.top_scorer?.player_id === entry.player_id,
                  inTeamOfTheWeek: latestHighlights?.team_of_the_week?.players.some((player) => player.player_id === entry.player_id) ?? false,
                }}
              />
            )) : <EmptyState title="Sem gols ainda" description="A artilharia aparece aqui assim que a rodada gerar resultados." />}
          </div>
        </div>
        <div className="page-card">
          <SectionHeader eyebrow="Assistencias" title="Criadores" />
          <div className="mt-6 space-y-3">
            {leaders.topAssists.length ? leaders.topAssists.map((entry, index) => (
              <RankingRow
                key={entry.id}
                entry={entry}
                index={index}
                highlightState={{
                  isBestPlayer: (latestHighlights?.best_average_player?.player_id ?? latestHighlights?.best_player?.player_id) === entry.player_id,
                  isTopScorer: latestHighlights?.top_scorer?.player_id === entry.player_id,
                  inTeamOfTheWeek: latestHighlights?.team_of_the_week?.players.some((player) => player.player_id === entry.player_id) ?? false,
                }}
              />
            )) : <EmptyState title="Sem assistencias ainda" description="Os líderes de criação aparecem aqui." />}
          </div>
        </div>
        <div className="page-card">
          <SectionHeader eyebrow="Defesa" title="Seguranca atras" />
          <div className="mt-6 space-y-3">
            {leaders.topDefense.length ? leaders.topDefense.map((entry, index) => (
              <RankingRow
                key={entry.id}
                entry={entry}
                index={index}
                highlightState={{
                  isBestPlayer: (latestHighlights?.best_average_player?.player_id ?? latestHighlights?.best_player?.player_id) === entry.player_id,
                  isTopScorer: latestHighlights?.top_scorer?.player_id === entry.player_id,
                  inTeamOfTheWeek: latestHighlights?.team_of_the_week?.players.some((player) => player.player_id === entry.player_id) ?? false,
                }}
              />
            )) : <EmptyState title="Sem clean sheets ainda" description="A parte defensiva da liga será exibida aqui." />}
          </div>
        </div>
      </section>

      {latestHighlights ? (
        <RoundHighlightsPanel
          highlights={latestHighlights}
          eyebrow="Premiacoes automaticas"
          title="Encerramento da rodada com cara de conquista"
          description="Assim que a sessao termina, o sistema salva MVP, artilheiro e selecao para alimentar historico e comparativos futuros."
        />
      ) : null}

      <section className="page-card">
        <SectionHeader eyebrow="Roadmap de dados" title="Base pronta para expandir analise" description="A tela ja reserva o espaco para graficos simples, recortes por rodada e indicadores acumulados." />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { icon: BarChart3, title: "Aproveitamento", copy: "Preparado para vitórias, empates e saldo futuro." },
            { icon: Sparkles, title: "Destaques da rodada", copy: "Espaço para MVP, impacto e evolução de posição." },
            { icon: TrendingUp, title: "Comparativos", copy: "Base pronta para cortes por rodada e acumulado." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="surface-soft p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/12 text-sky-200">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[--color-text-400]">{item.copy}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
