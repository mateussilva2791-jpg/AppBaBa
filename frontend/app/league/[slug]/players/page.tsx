"use client";

import { Search, Shield, Sparkles, UserPlus, Users, Waves } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { PlayerCard } from "@/components/players/player-card";
import { buildPlayerFormValues, PlayerForm, type PlayerPayload } from "@/components/players/player-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Toast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getLeagueBySlug } from "@/lib/league";
import type { League, Player, PlayerStatus } from "@/lib/types";
import { formatStatusLabel } from "@/lib/ui";

const rosterStatusFilters: Array<{ label: string; value: PlayerStatus | "ALL" }> = [
  { label: "Todos", value: "ALL" },
  { label: "Ativos", value: "ACTIVE" },
  { label: "Confirmados", value: "CONFIRMED" },
  { label: "Pendentes", value: "PENDING" },
  { label: "Indisponiveis", value: "UNAVAILABLE" },
  { label: "Lesionados", value: "INJURED" },
  { label: "Suspensos", value: "SUSPENDED" },
];

export default function PlayersPage() {
  const router = useRouter();
  const routeParams = useParams<{ slug: string }>();
  const slug = Array.isArray(routeParams?.slug) ? routeParams.slug[0] : routeParams?.slug;

  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlayerStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [hasNoLeague, setHasNoLeague] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  async function loadData() {
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
      setError("");
      return;
    }

    const leaguePlayers = await apiRequest<Player[]>(`/leagues/${resolvedLeague.id}/players`, { token });
    setHasNoLeague(false);
    setLeague(resolvedLeague);
    setPlayers(leaguePlayers);
  }

  useEffect(() => {
    void loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Erro ao carregar jogadores."))
      .finally(() => setLoading(false));
  }, [router, slug]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesQuery =
        !query ||
        player.name.toLowerCase().includes(query.toLowerCase()) ||
        player.nickname?.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || player.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [players, query, statusFilter]);

  const rosterSummary = useMemo(() => {
    return {
      total: players.length,
      ready: players.filter((player) => player.status === "ACTIVE" || player.status === "CONFIRMED").length,
      averageOvr: players.length ? Math.round(players.reduce((sum, player) => sum + player.ovr, 0) / players.length) : 0,
    };
  }, [players]);

  const hasValidLeague = Boolean(league);

  async function handleCreatePlayer(payload: PlayerPayload) {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    if (!league) {
      setFormError("Crie ou entre em uma liga antes de cadastrar jogadores.");
      return;
    }

    setCreating(true);
    setError("");
    setFormError("");

    try {
      const createdPlayer = await apiRequest<Player>(`/leagues/${league.id}/players`, {
        method: "POST",
        token,
        body: payload,
      });

      setPlayers((currentPlayers) => [...currentPlayers, createdPlayer].sort((left, right) => left.name.localeCompare(right.name)));
      setToastMessage("Atleta adicionado ao elenco.");
    } catch (submissionError) {
      setFormError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel salvar o jogador.");
    } finally {
      setCreating(false);
    }
  }

  async function handleEditPlayer(payload: PlayerPayload) {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    if (!league || !selectedPlayer) {
      return;
    }

    setEditing(true);
    setEditError("");

    try {
      const updatedPlayer = await apiRequest<Player>(`/leagues/${league.id}/players/${selectedPlayer.id}`, {
        method: "PATCH",
        token,
        body: payload,
      });

      setPlayers((currentPlayers) =>
        currentPlayers
          .map((player) => (player.id === updatedPlayer.id ? updatedPlayer : player))
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
      setToastMessage("Dados do atleta atualizados.");
      setSelectedPlayer(null);
    } catch (submissionError) {
      setEditError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel atualizar o atleta.");
    } finally {
      setEditing(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <SkeletonCard className="h-[520px] rounded-[28px]" />
        <SkeletonCard className="h-[720px] rounded-[28px]" />
      </div>
    );
  }

  if (hasNoLeague) {
    return <EmptyLeagueState />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Elenco da liga"
        title="Gestao de atletas com cara de produto esportivo premium."
        description="O cadastro ficou mais elegante, direto e funcional. Status ganham leitura imediata, atributos ficam claros e a edicao entra no fluxo sem gambiarra."
        stats={
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Atletas</p><strong className="mt-2 block text-xl text-white">{rosterSummary.total}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">Prontos para jogar</p><strong className="mt-2 block text-xl text-white">{rosterSummary.ready}</strong></div>
            <div className="stat-chip"><p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">OVR medio</p><strong className="mt-2 block text-xl text-white">{rosterSummary.averageOvr}</strong></div>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="page-card">
          <SectionHeader
            eyebrow="Novo atleta"
            title="Cadastrar jogador"
            description="Formulario limpo, sem posicao principal, com atributos explicitos e melhor leitura para a operacao."
          />

          <div className="mt-6 space-y-4">
            <div className="surface-soft grid gap-3 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-400/12 p-3 text-emerald-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Cadastro orientado ao sorteio</p>
                  <p className="mt-1 text-sm leading-6 text-[--color-text-secondary]">
                    Os atributos abaixo alimentam o sorteio balanceado e ajudam a manter o elenco com leitura confiavel.
                  </p>
                </div>
              </div>
            </div>

            {!hasValidLeague ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-[--color-text-300]">
                Voce precisa criar ou entrar em uma liga para cadastrar jogadores.
              </div>
            ) : null}

            <PlayerForm
              mode="create"
              submitLabel={!hasValidLeague ? "Liga necessaria" : "Adicionar jogador"}
              pending={creating || !hasValidLeague}
              error={formError}
              onSubmit={handleCreatePlayer}
            />
          </div>
        </div>

        <div className="page-card">
          <SectionHeader
            eyebrow="Elenco"
            title="Base esportiva da liga"
            description="Busca rapida, badges consistentes e cards fortes para gerir o grupo sem cara de prototipo."
          />

          <div className="mt-6 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-400]" />
              <input className="input-shell w-full pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou apelido" />
            </div>

            <div className="flex flex-wrap gap-2">
              {rosterStatusFilters.map((filterItem) => (
                <button
                  key={filterItem.value}
                  type="button"
                  className={
                    statusFilter === filterItem.value
                      ? "rounded-full border border-emerald-400/22 bg-emerald-400/12 px-4 py-2 text-sm font-semibold text-emerald-100"
                      : "rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[--color-text-secondary] transition hover:bg-white/[0.05] hover:text-white"
                  }
                  onClick={() => setStatusFilter(filterItem.value)}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="surface-soft p-4">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[--color-text-muted]">
                <Users className="h-4 w-4 text-[--color-accent-primary]" />
                Total do elenco
              </span>
              <strong className="mt-3 block text-2xl text-white">{filteredPlayers.length}</strong>
            </div>
            <div className="surface-soft p-4">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[--color-text-muted]">
                <Shield className="h-4 w-4 text-[--color-accent-primary]" />
                Status em foco
              </span>
              <strong className="mt-3 block text-2xl text-white">{statusFilter === "ALL" ? "Todos" : formatStatusLabel(statusFilter)}</strong>
            </div>
            <div className="surface-soft p-4">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[--color-text-muted]">
                <Waves className="h-4 w-4 text-[--color-accent-primary]" />
                Media de ataque
              </span>
              <strong className="mt-3 block text-2xl text-white">
                {filteredPlayers.length ? Math.round(filteredPlayers.reduce((sum, player) => sum + player.attack_rating, 0) / filteredPlayers.length) : 0}
              </strong>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredPlayers.length ? (
              filteredPlayers.map((player) => <PlayerCard key={player.id} player={player} onEdit={setSelectedPlayer} />)
            ) : (
              <EmptyState
                title="Nenhum atleta apareceu nessa leitura"
                description="Tente outro filtro ou cadastre um novo jogador para comecar a formar um elenco com cara de produto esportivo de verdade."
                action={
                  <button type="button" className="btn-primary w-fit" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    <UserPlus className="h-4 w-4" />
                    Cadastrar atleta
                  </button>
                }
              />
            )}
          </div>
        </div>
      </section>

      {selectedPlayer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,4,7,0.72)] p-4 backdrop-blur-md">
          <div className="page-card max-h-[92vh] w-full max-w-3xl overflow-y-auto">
            <SectionHeader
              eyebrow="Editar atleta"
              title={`Atualizar ${selectedPlayer.name}`}
              description="Os dados atuais ja chegam preenchidos para voce ajustar apelido, status e atributos sem sair da lista."
            />

            <div className="mt-6">
              <PlayerForm
                mode="edit"
                initialValues={buildPlayerFormValues(selectedPlayer)}
                submitLabel="Salvar alteracoes"
                pending={editing}
                error={editError}
                onCancel={() => setSelectedPlayer(null)}
                onSubmit={handleEditPlayer}
              />
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? <Toast message={toastMessage} /> : null}
    </div>
  );
}
