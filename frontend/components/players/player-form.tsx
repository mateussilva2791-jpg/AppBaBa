"use client";

import { AlertCircle, BarChart3, HeartPulse, Shield, Sparkles, Wind } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import type { PlayerStatus } from "@/lib/types";
import { formatStatusLabel } from "@/lib/ui";

const ATTRIBUTE_MIN = 0;
const ATTRIBUTE_MAX = 100;

const playerStatuses: PlayerStatus[] = ["ACTIVE", "UNAVAILABLE", "INJURED", "SUSPENDED", "PENDING", "CONFIRMED"];

const attributeFields = [
  { key: "attack_rating", label: "Ataque", icon: Sparkles, hint: "Presenca ofensiva, finalizacao e agressividade positiva." },
  { key: "passing_rating", label: "Passe", icon: BarChart3, hint: "Leitura de jogo, construcao e distribuicao de bola." },
  { key: "defense_rating", label: "Defesa", icon: Shield, hint: "Cobertura, combate e recuperacao defensiva." },
  { key: "stamina_rating", label: "Folego", icon: Wind, hint: "Intensidade, repeticao de esforco e constancia fisica." },
] as const;

type AttributeKey = (typeof attributeFields)[number]["key"];

export type PlayerFormValues = {
  name: string;
  nickname: string;
  status: PlayerStatus;
} & Record<AttributeKey, string>;

export type PlayerPayload = {
  name: string;
  nickname: string | null;
  status: PlayerStatus;
  attack_rating: number;
  passing_rating: number;
  defense_rating: number;
  stamina_rating: number;
};

const defaultValues: PlayerFormValues = {
  name: "",
  nickname: "",
  status: "ACTIVE",
  attack_rating: "50",
  passing_rating: "50",
  defense_rating: "50",
  stamina_rating: "50",
};

function sanitizeNumeric(value: string) {
  return value.replace(/[^\d]/g, "");
}

function validateAttribute(label: string, rawValue: string) {
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return `${label}: informe um numero valido entre ${ATTRIBUTE_MIN} e ${ATTRIBUTE_MAX}.`;
  }
  if (numericValue < ATTRIBUTE_MIN || numericValue > ATTRIBUTE_MAX) {
    return `${label}: use um valor entre ${ATTRIBUTE_MIN} e ${ATTRIBUTE_MAX}.`;
  }
  return null;
}

function normalizeValues(values: PlayerFormValues): { payload?: PlayerPayload; error?: string } {
  if (!values.name.trim()) {
    return { error: "Informe o nome do atleta." };
  }

  for (const field of attributeFields) {
    const error = validateAttribute(field.label, values[field.key]);
    if (error) {
      return { error };
    }
  }

  return {
    payload: {
      name: values.name.trim(),
      nickname: values.nickname.trim() || null,
      status: values.status,
      attack_rating: Number(values.attack_rating),
      passing_rating: Number(values.passing_rating),
      defense_rating: Number(values.defense_rating),
      stamina_rating: Number(values.stamina_rating),
    },
  };
}

export function buildPlayerFormValues(player?: {
  name: string;
  nickname: string | null;
  status: PlayerStatus;
  attack_rating: number;
  passing_rating: number;
  defense_rating: number;
  stamina_rating: number;
}): PlayerFormValues {
  if (!player) {
    return defaultValues;
  }

  return {
    name: player.name,
    nickname: player.nickname ?? "",
    status: player.status,
    attack_rating: String(player.attack_rating),
    passing_rating: String(player.passing_rating),
    defense_rating: String(player.defense_rating),
    stamina_rating: String(player.stamina_rating),
  };
}

export function PlayerForm({
  mode,
  initialValues,
  pending,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initialValues?: PlayerFormValues;
  pending?: boolean;
  error?: string;
  submitLabel: string;
  onSubmit: (payload: PlayerPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<PlayerFormValues>(initialValues ?? defaultValues);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setValues(initialValues ?? defaultValues);
    setValidationError("");
  }, [initialValues]);

  const ovrPreview = Math.round(
    (Number(values.attack_rating || 0) + Number(values.passing_rating || 0) + Number(values.defense_rating || 0) + Number(values.stamina_rating || 0)) / 4,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeValues(values);
    if (!normalized.payload) {
      setValidationError(normalized.error ?? "Revise os dados do atleta.");
      return;
    }

    setValidationError("");
    await onSubmit(normalized.payload);

    if (mode === "create") {
      setValues(defaultValues);
    }
  }

  function updateValue(key: keyof PlayerFormValues, value: string) {
    setValidationError("");
    setValues((current) => ({
      ...current,
      [key]: key.endsWith("_rating") ? sanitizeNumeric(value) : value,
    }));
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[--color-text-primary]">Nome do atleta</label>
          <input className="input-shell w-full" value={values.name} onChange={(event) => updateValue("name", event.target.value)} placeholder="Ex.: Joao Vitor" required />
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[--color-text-primary]">Apelido</label>
            <input className="input-shell w-full" value={values.nickname} onChange={(event) => updateValue("nickname", event.target.value)} placeholder="Como a turma chama esse jogador" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[--color-text-primary]">Status do atleta</label>
            <select className="input-shell w-full" value={values.status} onChange={(event) => updateValue("status", event.target.value)}>
              {playerStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="surface-elevated space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[--color-text-primary]">Atributos para sorteio balanceado</h3>
            <p className="text-sm leading-6 text-[--color-text-secondary]">
              Esses indicadores ajudam o App do Baba a montar times mais equilibrados, mantendo leitura rapida e ajuste fino.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/14 bg-emerald-400/10 px-4 py-3 text-right">
            <span className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/80">OVR estimado</span>
            <strong className="mt-1 block text-2xl text-white">{Number.isFinite(ovrPreview) ? ovrPreview : 0}</strong>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {attributeFields.map((field) => {
            const Icon = field.icon;
            return (
              <label key={field.key} className="surface-soft flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[--color-text-primary]">
                      <Icon className="h-4 w-4 text-[--color-accent-primary]" />
                      {field.label}
                    </span>
                    <p className="text-xs leading-5 text-[--color-text-muted]">{field.hint}</p>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[--color-text-muted]">0-100</span>
                </div>
                <input
                  className="input-shell w-full"
                  type="number"
                  min={ATTRIBUTE_MIN}
                  max={ATTRIBUTE_MAX}
                  step="1"
                  inputMode="numeric"
                  value={values[field.key]}
                  onChange={(event) => updateValue(field.key, event.target.value)}
                />
              </label>
            );
          })}
        </div>
      </div>

      {validationError ? (
        <div className="rounded-2xl border border-amber-300/18 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {validationError}
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          <span className="inline-flex items-center gap-2">
            <HeartPulse className="h-4 w-4" />
            {error}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {onCancel ? <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button> : null}
        <button type="submit" className="btn-primary min-w-[190px]" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
