"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type TopBarProps = {
  label: string;
  sublabel?: string;
  isLive?: boolean;
  deadline?: string;
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
};

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(248,113,113,0.28)] bg-[rgba(248,113,113,0.1)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f87171]">
      <span
        className="h-1.5 w-1.5 rounded-full bg-[#f87171]"
        style={{ animation: "live-pulse 1.4s ease-in-out infinite", boxShadow: "0 0 6px #f87171" }}
      />
      Ao vivo
    </span>
  );
}

export function TopBar({
  label,
  sublabel,
  isLive = false,
  deadline,
  onPrev,
  onNext,
  canGoPrev = true,
  canGoNext = true,
}: TopBarProps) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-[rgba(154,184,158,0.08)] px-4 sm:px-6">
      {/* round selector */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="round-selector-btn"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="Rodada anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex min-w-[7rem] flex-col items-center">
          <span className="font-[family-name:var(--font-manrope)] text-[13px] font-bold leading-none text-[--color-text-primary]">
            {label}
          </span>
          {sublabel ? (
            <span className="mt-0.5 text-[10px] leading-none text-[--color-text-muted]">{sublabel}</span>
          ) : null}
        </div>

        <button
          type="button"
          className="round-selector-btn"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Próxima rodada"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* live badge */}
      {isLive ? <LiveBadge /> : null}

      {/* deadline tag */}
      {deadline ? (
        <span className="ml-auto rounded-lg border border-[rgba(154,184,158,0.1)] bg-[rgba(154,184,158,0.04)] px-2.5 py-1 text-[11px] font-medium text-[--color-text-muted]">
          Prazo: {deadline}
        </span>
      ) : null}
    </div>
  );
}
