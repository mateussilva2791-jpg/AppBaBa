"use client";

import { Crosshair, Sparkles } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { getEventLabel } from "@/lib/live";
import type { LiveTeam, MatchEventType } from "@/lib/types";


export function LiveActionContext({
  action,
  team,
  disabled = false,
}: {
  action: MatchEventType | null;
  team: LiveTeam | null;
  disabled?: boolean;
}) {
  return (
    <div className="surface-elevated p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Modo visual</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Campo interativo da rodada</h3>
          <p className="mt-2 text-sm text-[--color-text-400]">
            {disabled
              ? "A cabine esta em modo de leitura. O campo continua disponivel para consulta visual."
              : action && team
                ? `Toque em um atleta do ${team.name} para registrar ${getEventLabel(action).toLowerCase()}.`
                : action
                  ? `A acao ${getEventLabel(action).toLowerCase()} ja esta pronta. Escolha o time no toggle e toque no jogador no campo.`
                  : "Escolha uma acao nos controles atuais e use o campo como atalho visual para selecionar o jogador."}
          </p>
        </div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
          {action ? <Crosshair className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <StatusBadge tone={action ? "info" : "neutral"}>{action ? getEventLabel(action) : "Sem acao ativa"}</StatusBadge>
        <StatusBadge tone={team ? "success" : "neutral"}>{team?.name ?? "Time nao selecionado"}</StatusBadge>
      </div>
    </div>
  );
}
