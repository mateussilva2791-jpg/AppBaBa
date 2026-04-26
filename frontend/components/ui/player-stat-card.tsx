"use client";

import { Flame, Shield, Sparkles, Zap } from "lucide-react";
import { useEffect, useRef } from "react";

import { PlayerStatusBadge } from "@/components/players/player-status-badge";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import type { Player } from "@/lib/types";


const positionLabel: Record<string, string> = {
  GOL: "Goleiro",
  DEF: "Defensor",
  LAT: "Lateral",
  MEI: "Meia",
  ATA: "Atacante",
};

function deriveOverall(player: Pick<Player, "attack_rating" | "passing_rating" | "defense_rating" | "stamina_rating" | "skill_level">) {
  const technicalCore =
    player.attack_rating * 0.31
    + player.passing_rating * 0.23
    + player.defense_rating * 0.26
    + player.stamina_rating * 0.2;
  return Math.round(technicalCore * 0.68 + player.skill_level * 10 * 0.32);
}

function StatRail({ label, value, accent }: { label: string; value: number; accent: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.width = `${Math.min(100, value)}%`;
    });
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[--color-text-400]">
        <span>{label}</span>
        <strong className="text-white">{value}</strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{ width: "0%", background: accent, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </div>
    </div>
  );
}

export function PlayerStatCard({ player }: { player: Player }) {
  const overall = deriveOverall(player);
  const cardRef = useRef<HTMLElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    el.style.transition = "transform 0.08s linear";
  }

  function handleMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(700px) rotateY(0deg) rotateX(0deg)";
    el.style.transition = "transform 0.5s ease";
  }

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="player-card flex flex-col gap-5 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <PlayerAvatar name={player.name} />
          <div>
            <h3 className="font-semibold text-white">{player.name}</h3>
            <p className="text-sm text-[--color-text-400]">
              {player.nickname ?? positionLabel[player.position ?? ""] ?? "Sem posicao fixa"}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-right">
          <PlayerStatusBadge status={player.status} />
          <div className="rounded-[22px] border border-cyan-300/15 bg-cyan-400/10 px-3 py-2">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-cyan-100">Overall</span>
            <strong className="text-2xl text-white">{overall}</strong>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-[24px] border border-white/8 bg-black/15 p-4">
        <StatRail label="Ataque" value={player.attack_rating} accent="linear-gradient(90deg,#20d6a2,#0c8a80)" />
        <StatRail label="Passe" value={player.passing_rating} accent="linear-gradient(90deg,#3fd7ff,#1a7cff)" />
        <StatRail label="Defesa" value={player.defense_rating} accent="linear-gradient(90deg,#8ee66b,#2f9d57)" />
        <StatRail label="Folego" value={player.stamina_rating} accent="linear-gradient(90deg,#ffcf5f,#f38b2f)" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-[--color-text-300]">
        {[
          { label: "Nivel", icon: Flame, value: player.skill_level },
          { label: "Velocidade", icon: Zap, value: player.relative_speed },
          { label: "Forca", icon: Shield, value: player.relative_strength },
          { label: "Funcao", icon: Sparkles, value: positionLabel[player.position ?? ""] ?? "Livre" },
        ].map(({ label, icon: Icon, value }) => (
          <div key={label} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-3">
            <span className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[--color-text-400]">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <strong className="block text-xl leading-tight text-white">{value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
