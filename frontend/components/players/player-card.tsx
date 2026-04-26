"use client";

import { PencilLine, Shield, Sparkles, Waves, Wind } from "lucide-react";
import { useEffect, useRef } from "react";

import { PlayerStatusBadge } from "@/components/players/player-status-badge";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import type { Player } from "@/lib/types";


const metrics = [
  { key: "attack_rating", label: "Ataque", icon: Sparkles, accent: "linear-gradient(90deg,#20d6a2,#0c8a80)" },
  { key: "passing_rating", label: "Passe", icon: Waves, accent: "linear-gradient(90deg,#3fd7ff,#1a7cff)" },
  { key: "defense_rating", label: "Defesa", icon: Shield, accent: "linear-gradient(90deg,#8ee66b,#2f9d57)" },
  { key: "stamina_rating", label: "Folego", icon: Wind, accent: "linear-gradient(90deg,#ffcf5f,#f38b2f)" },
] as const;

function AnimatedBar({ value, accent }: { value: number; accent: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.width = `${Math.min(100, value)}%`;
    });
  }, [value]);

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
      <div
        ref={barRef}
        className="h-full rounded-full"
        style={{ width: "0%", background: accent, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </div>
  );
}

export function PlayerCard({ player, onEdit }: { player: Player; onEdit: (player: Player) => void }) {
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
      className="player-card flex h-full flex-col gap-5 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar name={player.name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-white">{player.name}</h3>
              <PlayerStatusBadge status={player.status} />
            </div>
            <p className="mt-1 truncate text-sm text-[--color-text-secondary]">
              {player.nickname ?? "Sem apelido definido ainda"}
            </p>
          </div>
        </div>
        <button type="button" className="btn-secondary px-3 py-2" onClick={() => onEdit(player)}>
          <PencilLine className="h-4 w-4" />
          Editar
        </button>
      </div>

      {/* metric bars */}
      <div className="space-y-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const val = player[metric.key];
          return (
            <div key={metric.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 uppercase tracking-[0.16em] text-[--color-text-muted]">
                  <Icon className="h-3.5 w-3.5" />
                  {metric.label}
                </span>
                <strong className="text-white">{val}</strong>
              </div>
              <AnimatedBar value={val} accent={metric.accent} />
            </div>
          );
        })}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-3">
        {[
          { label: "OVR", value: player.ovr },
          { label: "Ritmo", value: player.relative_speed },
          { label: "Impacto", value: player.skill_level },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[--color-text-muted]">{label}</span>
            <strong className="mt-2 block text-xl text-white">{value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
