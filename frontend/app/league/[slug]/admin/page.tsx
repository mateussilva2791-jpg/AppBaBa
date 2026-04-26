"use client";

import { CheckCircle2, Crown, Settings2, Shield, Users, XCircle } from "lucide-react";
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

const govSections = [
  { icon: Settings2, title: "Regras de pontuacao", copy: "Pesos por gol, assistencia e bonus de desempenho.", status: "Em breve" },
  { icon: Users, title: "Membros da liga", copy: "Administradores, registradores e perfis operacionais.", status: "Em breve" },
  { icon: Shield, title: "Permissoes", copy: "Controle granular por role: OWNER, ADMIN e operadores.", status: "Em breve" },
  { icon: Crown, title: "Assinatura", copy: "Plano ativo, recursos disponiveis e historico de cobranca.", status: "Ativo" },
];

export default function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [features, setFeatures] = useState<FeatureAccess | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
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
        setFeatures(null);
        setPlans([]);
        setError("");
        return;
      }
      const [featureFlags, planList] = await Promise.all([
        apiRequest<FeatureAccess>(`/billing/leagues/${resolvedLeague.id}/features`, { token }),
        apiRequest<SubscriptionPlan[]>("/billing/plans"),
      ]);

      setHasNoLeague(false);
      setLeague(resolvedLeague);
      setFeatures(featureFlags);
      setPlans(planList);
    }

    void loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Erro ao carregar administracao."))
      .finally(() => setLoading(false));
  }, [params, router]);

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

  const currentPlan = plans.find((plan) => plan.code === features?.plan);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administracao"
        title="Gestao da liga com a mesma identidade do produto principal."
        description="Permissao, configuracao, plano e regras de operacao em uma camada administrativa premium, sem virar painel generico."
        stats={
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-chip">
              <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Liga</p>
              <strong className="mt-2 block text-lg text-white">{league?.name ?? "-"}</strong>
            </div>
            <div className="stat-chip">
              <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Plano</p>
              <strong className="mt-2 block text-lg text-white">{features?.plan ?? "-"}</strong>
            </div>
            <div className="stat-chip">
              <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Status</p>
              <strong className="mt-2 flex items-center gap-2 text-lg text-white">
                <CheckCircle2 className="h-4 w-4 text-[--color-accent-primary]" />
                Ativo
              </strong>
            </div>
          </div>
        }
      />

      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="page-card">
          <SectionHeader eyebrow="Governanca" title="Areas de configuracao" />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {govSections.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="surface-soft p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/12 text-sky-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <StatusBadge tone={item.status === "Ativo" ? "success" : "neutral"}>{item.status}</StatusBadge>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[--color-text-400]">{item.copy}</p>
                </div>
              );
            })}
          </div>

          {league ? (
            <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <p className="eyebrow">Identidade</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-muted]">Nome</p>
                  <strong className="mt-2 block text-white">{league.name}</strong>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-muted]">Slug</p>
                  <strong className="mt-2 block font-mono text-[--color-accent-primary]">{league.slug}</strong>
                </div>
                {league.description ? (
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-muted]">Descricao</p>
                    <p className="mt-2 text-sm text-white">{league.description}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="page-card">
            <SectionHeader eyebrow="Recursos do plano" title="Estado atual" />
            <div className="mt-6 space-y-2">
              {features ? (
                Object.entries(features.features).map(([key, enabled]) => (
                  <div key={key} className="surface-soft flex items-center gap-4 p-4">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${enabled ? "bg-emerald-400/12 text-emerald-300" : "bg-white/6 text-[--color-text-muted]"}`}>
                      {enabled ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{featureLabels[key] ?? key}</p>
                      <p className="text-xs text-[--color-text-400]">{enabled ? "Disponivel na liga" : "Bloqueado no plano atual"}</p>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </section>

          {currentPlan ? (
            <section className="page-card">
              <SectionHeader eyebrow="Plano ativo" title={currentPlan.name} />
              <div className="mt-4 rounded-[22px] border border-emerald-300/14 bg-emerald-400/8 px-5 py-4">
                <p className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-[-0.06em] text-white">
                  R$ {Number(currentPlan.price_monthly).toFixed(2)}
                  <span className="ml-1 text-sm font-medium tracking-normal text-[--color-text-400]">/mes</span>
                </p>
                <p className="mt-2 text-sm text-emerald-200">Plano ativo com todos os recursos disponiveis.</p>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
