"use client";

import type { ReactNode } from "react";


export function ConfirmationDialog({
  open,
  title,
  description,
  eyebrow = "Confirmacao",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  busy = false,
  busyLabel = "Processando...",
  tone = "default",
  onConfirm,
  onCancel,
  icon,
}: {
  open: boolean;
  title: string;
  description: string;
  eyebrow?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  icon?: ReactNode;
}) {
  if (!open) {
    return null;
  }

  const iconClass =
    tone === "danger"
      ? "bg-rose-400/12 text-rose-100"
      : "bg-amber-400/12 text-amber-100";
  const confirmClass =
    tone === "danger"
      ? "inline-flex items-center justify-center rounded-full border border-rose-300/20 bg-[linear-gradient(135deg,rgba(251,113,133,0.18),rgba(225,29,72,0.16))] px-5 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-200/35 hover:bg-[linear-gradient(135deg,rgba(251,113,133,0.28),rgba(225,29,72,0.22))] disabled:cursor-not-allowed disabled:opacity-60"
      : "btn-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,22,0.96),rgba(8,10,14,0.98))] p-6 shadow-[0_24px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-start gap-4">
          {icon ? <div className={`inline-flex h-14 w-14 items-center justify-center rounded-3xl ${iconClass}`}>{icon}</div> : null}
          <div className="min-w-0">
            <p className="eyebrow">{eyebrow}</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-[--color-text-300]">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
