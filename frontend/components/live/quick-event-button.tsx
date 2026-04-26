import type { ComponentType } from "react";


export function QuickEventButton({
  label,
  hint,
  icon: Icon,
  accentClass,
  glyph,
  active = false,
  disabled = false,
  statusLabel,
  emphasize = false,
  onClick,
}: {
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  accentClass: string;
  glyph?: string;
  active?: boolean;
  disabled?: boolean;
  statusLabel?: string;
  emphasize?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`group flex min-h-[118px] flex-col items-start justify-between rounded-[26px] border p-5 text-left transition ${
        active
          ? "border-cyan-300/30 bg-white/[0.08] shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
          : emphasize
            ? "border-emerald-300/22 bg-emerald-400/[0.08] shadow-[0_18px_40px_rgba(16,185,129,0.08)] hover:-translate-y-0.5 hover:border-emerald-200/30 hover:bg-emerald-400/[0.11]"
            : "border-white/8 bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/14 hover:bg-white/[0.05]"
      } ${disabled ? "cursor-not-allowed opacity-60 saturate-75" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white ${accentClass}`}>
        <Icon className="h-5 w-5" />
        {glyph ? (
          <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-black/20 bg-white/90 px-1 text-[10px] font-bold text-slate-900 shadow-sm">
            {glyph}
          </span>
        ) : null}
      </span>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-base text-white">{label}</strong>
          {statusLabel ? (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                disabled
                  ? "bg-white/8 text-[--color-text-400]"
                  : "bg-emerald-400/14 text-emerald-100"
              }`}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[--color-text-400]">{hint}</p>
      </div>
    </button>
  );
}
