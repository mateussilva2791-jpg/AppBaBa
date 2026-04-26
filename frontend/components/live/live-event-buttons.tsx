import type { ComponentType } from "react";

import {
  ArrowLeftRight,
  CircleOff,
  Flag,
  Hand,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  Square,
  TimerReset,
  Trophy,
} from "lucide-react";

import type { MatchEventType } from "@/lib/types";


type EventAction = {
  type: MatchEventType;
  label: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
};

type LiveEventButtonsProps = {
  disabled?: boolean;
  onAction: (type: MatchEventType) => void;
};

const EVENT_ACTIONS: EventAction[] = [
  { type: "GOAL", label: "Gol", accent: "from-emerald-400/20 to-emerald-500/5", icon: Trophy },
  { type: "ASSIST", label: "Assistencia", accent: "from-sky-400/20 to-sky-500/5", icon: Hand },
  { type: "FOUL", label: "Falta", accent: "from-white/12 to-white/2", icon: CircleOff },
  { type: "YELLOW_CARD", label: "Cartao amarelo", accent: "from-amber-400/25 to-amber-500/5", icon: Flag },
  { type: "RED_CARD", label: "Cartao vermelho", accent: "from-red-400/25 to-red-500/5", icon: ShieldAlert },
  { type: "SUBSTITUTION", label: "Substituicao", accent: "from-sky-400/18 to-emerald-400/5", icon: ArrowLeftRight },
  { type: "MATCH_STARTED", label: "Iniciar jogo", accent: "from-emerald-400/18 to-white/3", icon: PlayCircle },
  { type: "HALF_TIME", label: "Intervalo", accent: "from-white/12 to-white/2", icon: PauseCircle },
  { type: "SECOND_HALF_STARTED", label: "Segundo tempo", accent: "from-sky-400/18 to-white/3", icon: TimerReset },
  { type: "MATCH_FINISHED", label: "Encerrar jogo", accent: "from-red-400/18 to-white/3", icon: Square },
];

export function LiveEventButtons({ disabled, onAction }: LiveEventButtonsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {EVENT_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.type}
            type="button"
            className={`surface-soft flex min-h-28 flex-col items-start gap-4 bg-gradient-to-br ${action.accent} p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={disabled}
            onClick={() => onAction(action.type)}
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.08] text-white">
              <Icon className="h-5 w-5" />
            </span>
            <strong className="text-base text-white">{action.label}</strong>
          </button>
        );
      })}
    </div>
  );
}
