"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Trophy, UserX, RefreshCw, LogOut } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { AuthenticatedUser } from "@/lib/types";

const DEV_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "mateussilva2791@gmail.com";

type BetaUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  leagues: number;
  created_at: string;
  last_seen_at: string | null;
  online: boolean;
};

type BetaStats = {
  total_users: number;
  active_users: number;
  users_with_league: number;
  users_without_league: number;
};

function StatTile({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="page-card flex flex-col gap-2">
      <p className="text-xs uppercase tracking-[0.18em] text-[--color-text-400]">{label}</p>
      <strong
        className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold leading-none tracking-[-0.06em]"
        style={{ color }}
      >
        {value}
      </strong>
      {sub ? <p className="text-xs text-[--color-text-muted]">{sub}</p> : null}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DevPage() {
  const router = useRouter();
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [stats, setStats] = useState<BetaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load(token: string) {
    const [u, s] = await Promise.all([
      apiRequest<BetaUser[]>("/dev/users", { token }),
      apiRequest<BetaStats>("/dev/stats", { token }),
    ]);
    setUsers(u);
    setStats(s);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function init() {
      const me = await apiRequest<AuthenticatedUser>("/auth/me", { token: token! });
      if (me.email !== DEV_EMAIL) {
        router.replace("/login");
        return;
      }
      await load(token!);
    }

    void init()
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar painel dev."))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      const t = getToken();
      if (t) void load(t).catch(() => null);
    }, 30_000);

    return () => clearInterval(interval);
  }, [router]);

  async function handleRefresh() {
    const token = getToken();
    if (!token) return;
    setRefreshing(true);
    try {
      await load(token);
    } finally {
      setRefreshing(false);
    }
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[--color-accent-primary]" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
      </div>

      <div className="page-wrap py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Acesso restrito</p>
            <h1 className="page-title mt-1">Painel do Desenvolvedor</h1>
            <p className="muted-copy mt-2 max-w-lg">
              Visao geral dos usuarios que acessaram o App do Baba na fase beta.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="btn-secondary flex items-center gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button type="button" className="btn-ghost flex items-center gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>

        {error ? (
          <p className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {/* Stats */}
        {stats ? (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile label="Total de usuarios" value={stats.total_users} sub="cadastros no beta" color="#f0b429" />
            <StatTile label="Online agora" value={users.filter((u) => u.online).length} sub="últimos 5 min" color="#4ade80" />
            <StatTile label="Usuarios ativos" value={stats.active_users} sub="contas habilitadas" color="#60a5fa" />
            <StatTile label="Com liga criada" value={stats.users_with_league} sub="engajamento" color="#a78bfa" />
            <StatTile label="Sem liga" value={stats.users_without_league} sub="onboarding incompleto" color="#f87171" />
          </div>
        ) : null}

        {/* User table */}
        <section className="page-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Beta</p>
              <h2 className="section-title mt-1">Usuarios registrados</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[--color-accent-primary]/20 bg-[--color-accent-primary]/10 px-3 py-1 text-xs font-bold text-[--color-accent-primary]">
              <span className="h-1.5 w-1.5 rounded-full bg-[--color-accent-primary]" style={{ boxShadow: "0 0 6px #f0b429" }} />
              {users.length} usuario{users.length !== 1 ? "s" : ""}
            </span>
          </div>

          {users.length === 0 ? (
            <p className="py-10 text-center text-sm text-[--color-text-muted]">Nenhum usuario ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    <th className="pb-3 text-left text-xs uppercase tracking-[0.18em] text-[--color-text-muted] font-medium">Nome</th>
                    <th className="pb-3 text-left text-xs uppercase tracking-[0.18em] text-[--color-text-muted] font-medium">E-mail</th>
                    <th className="pb-3 text-center text-xs uppercase tracking-[0.18em] text-[--color-text-muted] font-medium">Ligas</th>
                    <th className="pb-3 text-center text-xs uppercase tracking-[0.18em] text-[--color-text-muted] font-medium">Online</th>
                    <th className="pb-3 text-center text-xs uppercase tracking-[0.18em] text-[--color-text-muted] font-medium">Conta</th>
                    <th className="pb-3 text-right text-xs uppercase tracking-[0.18em] text-[--color-text-muted] font-medium">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr
                      key={user.id}
                      className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] ${
                        i === users.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[--color-accent-primary]/10 font-[family-name:var(--font-manrope)] text-xs font-bold text-[--color-accent-primary]">
                              {user.full_name.slice(0, 2).toUpperCase()}
                            </span>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a1210] ${
                                user.online ? "bg-emerald-400" : "bg-white/20"
                              }`}
                              style={user.online ? { boxShadow: "0 0 6px #4ade80" } : undefined}
                            />
                          </div>
                          <span className="font-medium text-[--color-text-primary]">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-[--color-text-secondary]">{user.email}</td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${user.leagues > 0 ? "text-sky-300" : "text-[--color-text-muted]"}`}>
                          {user.leagues > 0 ? <Trophy className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                          {user.leagues}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        {user.online ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 5px #4ade80", animation: "live-pulse 1.4s ease-in-out infinite" }} />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[--color-text-muted]">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                            {user.last_seen_at ? formatDate(user.last_seen_at) : "Nunca"}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                            user.is_active
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          <Activity className="h-3 w-3" />
                          {user.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-mono text-xs text-[--color-text-muted]">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-[--color-text-muted]">
          Esta pagina e visivel apenas para <span className="text-[--color-accent-primary]">{DEV_EMAIL}</span>
        </p>
      </div>
    </div>
  );
}
