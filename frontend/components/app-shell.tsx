"use client";

import {
  BarChart3, CircleDollarSign, Crown, LayoutDashboard,
  LogOut, Menu, Radio, Shield, Terminal, Trophy, Users, Waves, X, Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { EmptyLeagueState } from "@/components/league/empty-league-state";
import { LeagueLoadError } from "@/components/league/league-load-error";
import { LeagueSkeleton } from "@/components/league/league-skeleton";
import { useActiveLeague } from "@/hooks/useActiveLeague";
import { invalidateAuthCache } from "@/hooks/useAuth";
import { clearToken } from "@/lib/auth";
import { clearActiveLeagueId } from "@/services/leagues/getActiveLeagueForUser";

type AppShellProps = { children: ReactNode };

const publicLinks = [
  { href: "/#recursos", label: "Recursos" },
  { href: "/#precos", label: "Preços" },
  { href: "/register", label: "Criar conta" },
  { href: "/login", label: "Entrar" },
];

const internalItems = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "session", label: "Rodada", icon: Waves },
  { href: "match", label: "Ao vivo", icon: Trophy },
  { href: "ranking", label: "Ranking", icon: Crown },
  { href: "players", label: "Jogadores", icon: Users },
  { href: "stats", label: "Estatísticas", icon: BarChart3 },
  { href: "admin", label: "Administração", icon: Shield },
  { href: "billing", label: "Plano", icon: CircleDollarSign },
];

const mobileBottomItems = ["", "session", "match", "ranking", "players"];

function BrandMark() {
  return (
    <img
      src="/icon-192.png"
      alt="BabaPro"
      width={40}
      height={40}
      className="shrink-0 rounded-[13px]"
      style={{ boxShadow: "0 0 18px rgba(240,180,41,0.25), 0 2px 8px rgba(0,0,0,0.4)" }}
    />
  );
}

function SidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: { href: string; label: string; icon: React.ElementType }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const activeIndex = items.findIndex(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  useEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const links = nav.querySelectorAll<HTMLAnchorElement>("a");
    const activeLink = links[activeIndex];
    if (!activeLink) {
      pill.style.opacity = "0";
      return;
    }
    pill.style.opacity = "1";
    pill.style.top = `${activeLink.offsetTop}px`;
    pill.style.height = `${activeLink.offsetHeight}px`;
  }, [activeIndex, pathname]);

  return (
    <nav ref={navRef} className="relative space-y-0.5">
      {/* sliding pill */}
      <div
        ref={pillRef}
        className="nav-sliding-pill absolute"
        style={{
          transition:
            "top 0.28s cubic-bezier(0.4,0,0.2,1), height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s",
          opacity: 0,
        }}
      />

      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`relative flex items-center gap-3 rounded-2xl px-4 py-[10px] text-sm font-medium transition-colors duration-150 ${
              active
                ? "text-[--color-text-primary]"
                : "text-[--color-text-secondary] hover:bg-[rgba(154,184,158,0.05)] hover:text-[--color-text-primary]"
            }`}
          >
            <Icon
              className={`nav-icon h-4 w-4 shrink-0 transition-colors duration-150 ${
                active ? "text-[--color-accent-primary]" : "text-[--color-text-muted]"
              }`}
            />
            <span className="flex-1">{item.label}</span>
            {active && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: "#f0b429",
                  boxShadow: "0 0 6px rgba(240,180,41,0.6)",
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

const SECTION_LABELS: Record<string, string> = {
  "": "Dashboard",
  session: "Rodada",
  match: "Ao vivo",
  ranking: "Ranking",
  players: "Jogadores",
  stats: "Estatísticas",
  admin: "Administração",
  billing: "Plano",
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isCreateLeagueRoute = pathname === "/league/new";
  const requestedLeagueSlug = useMemo(() => {
    if (isCreateLeagueRoute) return null;
    const match = pathname.match(/^\/league\/([^/]+)/);
    return match?.[1] ?? null;
  }, [isCreateLeagueRoute, pathname]);

  const isDevView = pathname === "/dev";
  const isInternalView = pathname.startsWith("/league");
  const { league, loading, error, isEmpty, refetch, auth } = useActiveLeague({
    requestedLeagueSlug,
    enabled: isInternalView && !isCreateLeagueRoute,
  });

  const sectionLabel = useMemo(() => {
    if (!league) return league === null ? "Workspace" : "Workspace";
    const slug = league.slug;
    const base = `/league/${slug}`;
    const tail = pathname.replace(base, "").replace(/^\//, "").split("/")[0] ?? "";
    return SECTION_LABELS[tail] ?? "Workspace";
  }, [league, pathname]);

  useEffect(() => {
    if (isInternalView && !auth.loading && !auth.user) {
      router.replace("/login");
    }
  }, [auth.loading, auth.user, isInternalView, router]);

  useEffect(() => {
    if (!league || !requestedLeagueSlug || isCreateLeagueRoute) return;
    if (league.slug === requestedLeagueSlug) return;
    router.replace(pathname.replace(`/league/${requestedLeagueSlug}`, `/league/${league.slug}`));
  }, [isCreateLeagueRoute, league, pathname, requestedLeagueSlug, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearToken();
    clearActiveLeagueId();
    invalidateAuthCache();
    router.push("/login");
  }

  /* ── DEV view (sem header público) ── */
  if (isDevView) return <>{children}</>;

  /* ── PUBLIC view ── */
  if (!isInternalView) {
    return (
      <div className="app-shell">
        <div className="bg-orbs">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
          <div className="bg-orb bg-orb-4" />
        </div>
        <div className="page-wrap">
          <header className="glass-panel sticky top-4 z-40 rounded-[28px] px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <BrandMark />
                <div>
                  <strong className="font-[family-name:var(--font-manrope)] text-[15px] tracking-[-0.03em] text-[--color-text-primary]">
                    BabaPro
                  </strong>
                  <p className="text-[10px] text-[--color-text-muted]">Sports SaaS para ligas e rodadas</p>
                </div>
              </Link>

              <nav className="hidden items-center gap-1 lg:flex">
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? "bg-[rgba(240,180,41,0.1)] text-[--color-accent-primary] ring-1 ring-[rgba(240,180,41,0.22)]"
                        : "text-[--color-text-secondary] hover:text-[--color-text-primary]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden items-center gap-3 lg:flex">
                <Link href="/register" className="btn-primary">
                  <Zap className="h-3.5 w-3.5" />
                  Começar grátis
                </Link>
              </div>

              <button
                type="button"
                className="btn-secondary lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 lg:hidden ${
                mobileOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="mt-4 flex flex-col gap-2">
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="btn-secondary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/register" className="btn-primary" onClick={() => setMobileOpen(false)}>
                  <Zap className="h-3.5 w-3.5" />
                  Começar grátis
                </Link>
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    );
  }

  /* ── INTERNAL view ── */
  const leagueItems = league
    ? internalItems.map((item) => ({
        ...item,
        href: item.href ? `/league/${league.slug}/${item.href}` : `/league/${league.slug}`,
      }))
    : [];

  const isMatchLive =
    league &&
    (pathname.startsWith(`/league/${league.slug}/match`) ||
      pathname.startsWith(`/league/${league.slug}/session`));

  return (
    <div className="app-shell">
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-orb bg-orb-4" />
      </div>

      <div className="app-grid">
        {/* overlay mobile */}
        <div
          className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
            mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />

        {/* ── SIDEBAR ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 lg:relative lg:block lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div
            className="flex h-full flex-col"
            style={{
              background:
                "linear-gradient(180deg,rgba(9,17,11,0.99) 0%,rgba(6,12,8,0.99) 100%)",
              borderRight: "1px solid rgba(154,184,158,0.07)",
            }}
          >
            {/* Brand */}
            <div className="p-4 pb-3">
              <Link
                href={league ? `/league/${league.slug}` : "/"}
                className="sidebar-brand"
                onClick={() => setMobileOpen(false)}
              >
                <BrandMark />
                <div className="min-w-0">
                  <strong className="block font-[family-name:var(--font-manrope)] text-[15px] tracking-[-0.03em] text-[--color-text-primary]">
                    BabaPro
                  </strong>
                  <p className="text-[10px] text-[--color-text-muted]">League operations</p>
                </div>
              </Link>

              <button
                type="button"
                className="btn-ghost absolute right-4 top-4 lg:hidden"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="gradient-divider mx-4" />

            {/* League card */}
            <div className="px-4 pt-3 pb-4">
              <div className="sidebar-league">
                <div className="sidebar-league-accent" />
                <div className="sidebar-league-body">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="live-dot" />
                    <p className="label-section">Liga ativa</p>
                  </div>
                  <h2
                    className="font-[family-name:var(--font-manrope)] text-[1.25rem] font-bold leading-tight tracking-[-0.04em] text-[--color-text-primary]"
                  >
                    {league?.name ?? "Sua liga"}
                  </h2>
                  {league?.description ? (
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.5] text-[--color-text-muted]">
                      {league.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto px-4">
              <p className="label-section mb-3">Navegação</p>
              {leagueItems.length > 0 && (
                <SidebarNav
                  items={leagueItems}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              )}

              {auth.user?.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "mateussilva2791@gmail.com") && (
                <div className="mt-4">
                  <div className="gradient-divider mb-3" />
                  <p className="label-section mb-2">Dev</p>
                  <Link
                    href="/dev"
                    onClick={() => setMobileOpen(false)}
                    className={`relative flex items-center gap-3 rounded-2xl px-4 py-[10px] text-sm font-medium transition-colors duration-150 ${
                      pathname === "/dev"
                        ? "text-[--color-text-primary]"
                        : "text-[--color-text-secondary] hover:bg-[rgba(154,184,158,0.05)] hover:text-[--color-text-primary]"
                    }`}
                  >
                    <Terminal className={`h-4 w-4 shrink-0 transition-colors duration-150 ${pathname === "/dev" ? "text-[--color-accent-primary]" : "text-[--color-text-muted]"}`} />
                    <span className="flex-1">Painel Dev</span>
                    {pathname === "/dev" && (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#f0b429", boxShadow: "0 0 6px rgba(240,180,41,0.6)" }} />
                    )}
                  </Link>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 pt-2">
              <div className="gradient-divider mb-3" />
              <div className="space-y-1.5">
                <Link
                  href="/league/new"
                  className="btn-primary w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Nova liga
                </Link>
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="min-w-0 pb-20 lg:pb-0">
          {/* Top bar */}
          <header
            className="sticky top-0 z-30 backdrop-blur-xl"
            style={{
              background: "rgba(8,15,10,0.92)",
              borderBottom: "1px solid rgba(154,184,158,0.07)",
            }}
          >
            <div className="page-wrap py-0">
              <div className="flex h-14 items-center justify-between gap-4">
                {/* Left: hamburger + breadcrumb */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="topbar-btn topbar-btn-secondary lg:hidden"
                    onClick={() => setMobileOpen((v) => !v)}
                  >
                    <Menu className="h-4 w-4" />
                  </button>

                  <div className="hidden items-center gap-2 lg:flex">
                    <span className="text-[10px] uppercase tracking-[0.28em] text-[--color-text-muted]">
                      {league?.name ?? "BabaPro"}
                    </span>
                    <span className="text-[--color-text-muted] opacity-30">/</span>
                    <span className="font-[family-name:var(--font-manrope)] text-[15px] font-semibold tracking-[-0.02em] text-[--color-text-primary]">
                      {sectionLabel}
                    </span>
                  </div>

                  {/* Mobile: only section label */}
                  <span className="font-[family-name:var(--font-manrope)] text-[15px] font-semibold tracking-[-0.02em] text-[--color-text-primary] lg:hidden">
                    {sectionLabel}
                  </span>
                </div>

                {/* Right: quick actions */}
                {league ? (
                  <div className="flex items-center gap-2">
                    {isMatchLive && (
                      <span className="live-pill hidden sm:inline-flex">
                        <span className="live-pill-dot" />
                        Ao vivo
                      </span>
                    )}
                    <Link
                      href={`/league/${league.slug}/match`}
                      className="topbar-btn topbar-btn-secondary hidden sm:inline-flex"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      Ao vivo
                    </Link>
                    <Link
                      href={`/league/${league.slug}/session`}
                      className="topbar-btn topbar-btn-primary"
                    >
                      <Waves className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Montar rodada</span>
                      <span className="sm:hidden">Rodada</span>
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="page-wrap">
            {isCreateLeagueRoute ? children : null}
            {!isCreateLeagueRoute && loading ? <LeagueSkeleton /> : null}
            {!isCreateLeagueRoute && !loading && error ? (
              <LeagueLoadError message={error} onRetry={refetch} />
            ) : null}
            {!isCreateLeagueRoute && !loading && !error && isEmpty ? <EmptyLeagueState /> : null}
            {!isCreateLeagueRoute && !loading && !error && !isEmpty ? children : null}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isInternalView && !isCreateLeagueRoute && league ? (
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl lg:hidden"
          style={{
            background: "rgba(8,14,10,0.98)",
            borderTop: "1px solid rgba(154,184,158,0.08)",
          }}
        >
          <div className="flex items-stretch">
            {leagueItems
              .filter((item) =>
                mobileBottomItems.some((key) =>
                  item.href.endsWith(key === "" ? league.slug : key),
                ),
              )
              .map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors ${
                      active ? "text-[--color-accent-primary]" : "text-[--color-text-muted]"
                    }`}
                  >
                    {active && (
                      <span
                        className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full"
                        style={{
                          background: "#f0b429",
                          boxShadow: "0 0 8px rgba(240,180,41,0.5)",
                        }}
                      />
                    )}
                    <Icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
