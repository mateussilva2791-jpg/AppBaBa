"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ElementType, ReactNode } from "react";

export type NavTab = {
  href: string;
  label: string;
  icon?: ElementType;
};

type NavBarProps = {
  brand?: ReactNode;
  tabs: NavTab[];
  actions?: ReactNode;
  statusLabel?: string;
};

function StatusPill({ label }: { label: string }) {
  return (
    <span className="status-pill-live">
      <span className="status-pill-live-dot" />
      {label}
    </span>
  );
}

export function NavBar({ brand, tabs, actions, statusLabel = "produção" }: NavBarProps) {
  const pathname = usePathname();

  return (
    <header className="glass-panel sticky top-0 z-40 px-4 py-0 sm:px-5">
      <div className="flex h-14 items-center gap-4">
        {/* brand */}
        <div className="flex shrink-0 items-center gap-3">
          {brand ?? (
            <Link href="/" className="flex items-center gap-2.5">
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-[family-name:var(--font-manrope)] text-sm font-extrabold text-[#0a1210]"
                style={{ background: "linear-gradient(135deg,#4ade80,#f0b429)" }}
              >
                B
              </span>
              <span className="hidden font-[family-name:var(--font-manrope)] text-[15px] font-bold tracking-[-0.03em] text-[--color-text-primary] sm:block">
                App do Baba
              </span>
            </Link>
          )}
        </div>

        {/* tabs */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-150 ${
                  active
                    ? "bg-[rgba(240,180,41,0.1)] text-[--color-accent-primary] ring-1 ring-[rgba(240,180,41,0.2)]"
                    : "text-[--color-text-secondary] hover:bg-[rgba(154,184,158,0.06)] hover:text-[--color-text-primary]"
                }`}
              >
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
                {tab.label}
                {active ? (
                  <span className="absolute -bottom-px left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[--color-accent-primary]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* actions + status */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {actions}
          <StatusPill label={statusLabel} />
        </div>
      </div>
    </header>
  );
}
