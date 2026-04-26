"use client";

import { ArrowUpRight, Crown, Medal, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { RoundHighlightsPanel } from "@/components/session/round-highlights-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RankingRow } from "@/components/ui/ranking-row";
import { SectionHeader } from "@/components/ui/section-header";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError, apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getLeagueBySlug } from "@/lib/league";
import type { FeatureAccess, League, RankingEntry, RankingSummary, SessionHighlights } from "@/lib/types";


export default function RankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [features, setFeatures] = useState<FeatureAccess | null>(null);
  const [summary, setSummary] = useState<RankingSummary | null>(null);
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
        setRanking([]);
        setFeatures(null);
        setSummary(null);
        setError("");
        return;
      }
      const [entries, featureFlags, rankingSummary] = await Promise.all([
        apiRequest<RankingEntry[]>(`/leagues/${resolvedLeague.id}/ranking`, { token }),
        apiRequest<FeatureAccess>(`/billing/leagues/${resolvedLeague.id}/features`, { token }),
        apiRequest<RankingSummary>(`/leagues/${resolvedLeague.id}/ranking/summary`, { token }),
      ]);
      setLeague(resolvedLeague);
      setHasNoLeague(false);
      setRanking(entries);
      setFeatures(featureFlags);
      setSummary(rankingSummary);
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
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Erro ao carregar ranking."))
      .finally(() => setLoading(false));
  }, [params, router]);

  const leaders = useMemo(() => ranking.slice(0, 3), [ranking]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-56 rounded-[28px]" />
        <SkeletonCard className="h-[600px] rounded-[28px]" />
      </div>
    );
  }

  if (hasNoLeague) {
    return <EmptyLeagueState />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ranking geral"
        title="Competicao tratada como experience layer do produto."
        description="A classificacao deixa de ser tabela seca e vira uma leitura competitiva clara, com hierarquia de destaque, lideranca e desempenho."
        stats={
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Liga</p><strong className="mt-2 block text-xl text-white">{league?.name ?? "-"}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Plano</p><strong className="mt-2 block text-xl text-white">{features?.plan ?? "-"}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Jogadores</p><strong className="mt-2 block text-xl text-white">{ranking.length}</strong></div>
          </div>
        }
      />

      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <div className="page-card">
          <SectionHeader eyebrow="Classificacao" title="Tabela da liga" />
          <div className="mt-6 space-y-3">
            {ranking.length ? (
              ranking.map((entry, index) => (
                <RankingRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  maxPoints={ranking[0]?.ranking_points}
                  highlightState={{
                    isBestPlayer: (latestHighlights?.best_average_player?.player_id ?? latestHighlights?.best_player?.player_id) === entry.player_id,
                    isTopScorer: latestHighlights?.top_scorer?.player_id === entry.player_id,
                    inTeamOfTheWeek: latestHighlights?.team_of_the_week?.players.some((player) => player.player_id === entry.player_id) ?? false,
                  }}
                />
              ))
            ) : (
              <EmptyState title="Nenhum ranking ainda" description="Finalize a primeira partida da liga para revelar a classificacao." />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="page-card">
            <SectionHeader eyebrow="Podio" title="Destaques da rodada" />
            <div className="mt-6 space-y-3">
              {leaders.length ? (
                leaders.map((entry, index) => (
                  <div key={entry.id} className="surface-soft p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge tone={index === 0 ? "warning" : index === 1 ? "info" : "success"}>
                            {index === 0 ? "Lider" : `Top ${index + 1}`}
                          </StatusBadge>
                          <span className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">{entry.matches_played} jogos</span>
                        </div>
                        <p className="mt-3 font-semibold text-white">{entry.player_name}</p>
                        <p className="mt-1 text-sm text-[--color-text-400]">{entry.goals} gols • {entry.assists} assistencias</p>
                      </div>
                      <div className="text-right">
                        <strong className="block text-2xl text-white">{entry.ranking_points}</strong>
                        <span className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">pts</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Podio indisponivel" description="Assim que a liga gerar resultados, o destaque aparece aqui." />
              )}
            </div>
          </section>

          <section className="page-card">
            <SectionHeader eyebrow="Leituras rapidas" title="Panorama competitivo" />
            <div className="mt-6 grid gap-3">
              {[
                { icon: Crown, label: "Maior pontuacao", value: summary?.overall_leader.value ?? leaders[0]?.ranking_points ?? 0 },
                { icon: ArrowUpRight, label: "Melhor assistente", value: summary?.top_assist_provider.value ?? 0 },
                { icon: Medal, label: "Artilharia", value: summary?.top_scorer.value ?? 0 },
                { icon: Sparkles, label: "Clean sheets", value: summary?.best_defense.value ?? 0 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="surface-soft flex items-center gap-4 p-4">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/12 text-sky-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">{item.label}</p>
                      <strong className="mt-2 block text-base text-white">{item.value}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>

      {latestHighlights ? (
        <RoundHighlightsPanel
          highlights={latestHighlights}
          eyebrow="Ultima rodada"
          title="Premiacoes mais recentes da liga"
          description="A classificacao geral agora conversa com o fechamento automatico da rodada, reforcando MVP, artilharia e selecao."
        />
      ) : null}
    </div>
  );
}
