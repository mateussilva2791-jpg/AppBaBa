"use client";

import { CreditCard, Gem, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getLeagueBySlug } from "@/lib/league";
import type { FeatureAccess, League, SubscriptionPlan } from "@/lib/types";


const featureLabels: Record<string, string> = {
  full_history: "Historico completo",
  full_ranking: "Ranking completo",
  full_reports: "Relatorios completos",
  automatic_ranking: "Ranking automatico",
  more_players: "Mais jogadores",
  more_sessions: "Mais sessoes",
  advanced_live: "Operacao live avancada",
  advanced_stats: "Estatisticas avancadas",
  public_dashboard: "Painel publico da rodada",
  multi_league: "Multiplas ligas",
};

export default function BillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<FeatureAccess | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasNoLeague, setHasNoLeague] = useState(false);

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
      setPlans([]);
      setFeatures(null);
      setError("");
      return;
    }
    const [availablePlans, currentFeatures] = await Promise.all([
      apiRequest<SubscriptionPlan[]>("/billing/plans"),
      apiRequest<FeatureAccess>(`/billing/leagues/${resolvedLeague.id}/features`, { token }),
    ]);

    setHasNoLeague(false);
    setLeague(resolvedLeague);
    setPlans(availablePlans);
    setFeatures(currentFeatures);
  }

  useEffect(() => {
    void loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Erro ao carregar planos."))
      .finally(() => setLoading(false));
  }, [params, router]);

  async function handleSelectPlan(planCode: string) {
    const token = getToken();
    if (!token || !league) {
      return;
    }

    try {
      setError("");
      await apiRequest(`/billing/leagues/${league.id}/subscription`, {
        method: "POST",
        token,
        body: { plan_code: planCode },
      });
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel alterar o plano.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-56 rounded-[28px]" />
        <SkeletonCard className="h-[520px] rounded-[28px]" />
      </div>
    );
  }

  if (hasNoLeague) {
    return <EmptyLeagueState />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planos e assinatura"
        title="Camada comercial integrada ao mesmo produto esportivo."
        description="Mesmo as telas administrativas de plano mantem identidade de produto, sem cair em dashboard genérico."
        stats={
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Liga</p><strong className="mt-2 block text-xl text-white">{league?.name ?? "-"}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Plano atual</p><strong className="mt-2 block text-xl text-white">{features?.plan ?? "-"}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Premium</p><strong className="mt-2 block text-xl text-white">{features?.premium_enabled ? "Ativo" : "Nao"}</strong></div>
          </div>
        }
      />

      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_380px]">
        <div className="page-card">
          <SectionHeader eyebrow="Estrutura comercial" title="Planos disponiveis" />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => {
              const isCurrent = features?.plan === plan.code;
              return (
                <article key={plan.id} className={`surface-soft p-5 ${isCurrent ? "ring-1 ring-sky-400/25" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{plan.code}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{plan.name}</h3>
                    </div>
                    {isCurrent ? <StatusBadge tone="info">Atual</StatusBadge> : null}
                  </div>
                  <p className="mt-4 font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-[-0.06em] text-white">
                    R$ {Number(plan.price_monthly).toFixed(2)}
                    <span className="ml-1 text-sm font-medium tracking-normal text-[--color-text-400]">/mes</span>
                  </p>
                  <div className="mt-5 space-y-2">
                    {Object.entries(plan.features).map(([key, enabled]) => (
                      <div key={key} className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2 text-sm">
                        <span className="text-[--color-text-300]">{featureLabels[key] ?? key}</span>
                        <span className={enabled ? "text-emerald-200" : "text-[--color-text-400]"}>{enabled ? "Sim" : "Nao"}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={isCurrent ? "btn-secondary mt-5 w-full" : "btn-primary mt-5 w-full"}
                    onClick={() => void handleSelectPlan(plan.code)}
                    disabled={isCurrent}
                  >
                    <CreditCard className="h-4 w-4" />
                    {isCurrent ? "Plano atual" : `Selecionar ${plan.code}`}
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <section className="page-card">
            <SectionHeader eyebrow="Recursos" title="Estado do plano" />
            <div className="mt-6 grid gap-3">
              {features ? (
                Object.entries(features.features).map(([key, enabled]) => (
                  <div key={key} className="surface-soft flex items-center gap-4 p-4">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/12 text-sky-200">
                      {enabled ? <Gem className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="text-sm text-white">{featureLabels[key] ?? key}</p>
                      <p className="text-sm text-[--color-text-400]">{enabled ? "Liberado no plano atual" : "Disponivel em upgrade"}</p>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </section>

          <section className="page-card">
            <SectionHeader eyebrow="Valor percebido" title="Upgrade recomendado" />
            <div className="mt-6 surface-soft p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-200">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-white">Leve a liga para a camada premium</p>
                  <p className="text-sm text-[--color-text-400]">Historico, ranking completo e relatórios evoluem junto com a operação.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
