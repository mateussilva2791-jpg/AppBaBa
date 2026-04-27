"use client";

import type { LiveTeam, MatchEventDetail, MatchEventType } from "@/lib/types";


type EventStats = { goals: number; assists: number; yellowCards: number; redCards: number };

function buildEventStats(events: MatchEventDetail[]): Map<string, EventStats> {
  const blank = (): EventStats => ({ goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
  const map = new Map<string, EventStats>();
  for (const e of events.filter((ev) => !ev.is_reverted)) {
    if (e.event_type === "GOAL" && e.player_id) {
      const s = map.get(e.player_id) ?? blank(); s.goals++; map.set(e.player_id, s);
    }
    if (e.event_type === "ASSIST" && e.player_id) {
      const s = map.get(e.player_id) ?? blank(); s.assists++; map.set(e.player_id, s);
    }
    if (e.event_type === "YELLOW_CARD" && e.player_id) {
      const s = map.get(e.player_id) ?? blank(); s.yellowCards++; map.set(e.player_id, s);
    }
    if (e.event_type === "RED_CARD" && e.player_id) {
      const s = map.get(e.player_id) ?? blank(); s.redCards++; map.set(e.player_id, s);
    }
  }
  return map;
}

// Home: bottom half (top 54–92%). Away: mirrored to top half.
const HOME_SLOTS = [
  { top: "90%", left: "50%" },   // GK
  { top: "76%", left: "20%" },
  { top: "76%", left: "50%" },
  { top: "76%", left: "80%" },
  { top: "63%", left: "14%" },
  { top: "63%", left: "36%" },
  { top: "63%", left: "64%" },
  { top: "63%", left: "86%" },
  { top: "54%", left: "33%" },
  { top: "54%", left: "67%" },
];

function mirror(s: { top: string; left: string }) {
  return {
    top: `${100 - parseFloat(s.top)}%`,
    left: `${100 - parseFloat(s.left)}%`,
  };
}

function resolveSlots(count: number, side: "home" | "away") {
  const base = side === "home" ? HOME_SLOTS : HOME_SLOTS.map(mirror);
  if (count <= base.length) return base.slice(0, count);
  return [
    ...base,
    ...Array.from({ length: count - base.length }, (_, i) => ({
      top: side === "home" ? `${46 - i * 6}%` : `${54 + i * 6}%`,
      left: i % 2 === 0 ? "42%" : "58%",
    })),
  ];
}

function initials(name: string, nickname?: string | null) {
  if (nickname) return nickname.slice(0, 3);
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function firstName(name: string, nickname?: string | null) {
  if (nickname) return nickname;
  return name.trim().split(" ")[0];
}

function EventBadge({ stats }: { stats: EventStats }) {
  if (stats.redCards)    return <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white shadow-md">✕</span>;
  if (stats.yellowCards) return <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-yellow-400 text-[7px] font-bold text-[#1a1a00] shadow-md">!</span>;
  if (stats.goals)       return <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[7px] shadow-md">⚽</span>;
  if (stats.assists)     return <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[7px] shadow-md">A</span>;
  return null;
}


export function MiniField({
  teams,
  events,
  selectedTeamId,
  activeAction,
  highlightedPlayerId,
  disabled = false,
  onSelectPlayer,
}: {
  teams: LiveTeam[];
  events: MatchEventDetail[];
  selectedTeamId: string | null;
  activeAction: MatchEventType | null;
  highlightedPlayerId: string | null;
  disabled?: boolean;
  onSelectPlayer: (playerId: string, teamId: string) => void;
}) {
  const [homeTeam, awayTeam] = teams;
  const stats = buildEventStats(events);

  const clickable = !disabled && !!activeAction;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/8"
      style={{
        height: 240,
        background: "linear-gradient(180deg, #0a2018 0%, #0d2a1e 50%, #0a2018 100%)",
      }}
    >
      {/* ─── Field lines ─── */}
      <svg
        className="pointer-events-none absolute inset-0"
        width="100%"
        height="100%"
        viewBox="0 0 400 240"
        preserveAspectRatio="none"
      >
        {/* Midfield line */}
        <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        {/* Center circle */}
        <circle cx="200" cy="120" r="36" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        {/* Center spot */}
        <circle cx="200" cy="120" r="2.5" fill="rgba(255,255,255,0.2)" />
        {/* Home penalty box */}
        <rect x="110" y="185" width="180" height="55" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        {/* Away penalty box */}
        <rect x="110" y="0" width="180" height="55" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        {/* Home goal */}
        <rect x="155" y="228" width="90" height="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        {/* Away goal */}
        <rect x="155" y="0" width="90" height="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        {/* Outer border */}
        <rect x="1" y="1" width="398" height="238" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      </svg>

      {/* ─── Team labels ─── */}
      {homeTeam && (
        <span className="pointer-events-none absolute bottom-1.5 left-2 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300/50">
          {homeTeam.name}
        </span>
      )}
      {awayTeam && (
        <span className="pointer-events-none absolute left-2 top-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sky-300/50">
          {awayTeam.name}
        </span>
      )}

      {/* ─── Players ─── */}
      {[
        ...(homeTeam ? homeTeam.players.map((p, i) => ({ player: p, side: "home" as const, teamId: homeTeam.id, slot: resolveSlots(homeTeam.players.length, "home")[i] })) : []),
        ...(awayTeam ? awayTeam.players.map((p, i) => ({ player: p, side: "away" as const, teamId: awayTeam.id, slot: resolveSlots(awayTeam.players.length, "away")[i] })) : []),
      ].map(({ player, side, teamId, slot }) => {
        if (!slot) return null;

        const playerStats = stats.get(player.player_id) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
        const isHighlighted = highlightedPlayerId === player.player_id;
        const isTeamSelected = selectedTeamId === teamId;

        const baseColor = side === "home"
          ? "border-emerald-400/40 bg-emerald-900/60 text-emerald-100"
          : "border-sky-400/40 bg-sky-900/60 text-sky-100";

        const highlightColor = "border-white/60 bg-white/20 text-white scale-110";
        const dimColor = side === "home"
          ? "border-emerald-400/20 bg-emerald-900/30 text-emerald-200/50"
          : "border-sky-400/20 bg-sky-900/30 text-sky-200/50";

        let nodeClass = baseColor;
        if (isHighlighted) nodeClass = highlightColor;
        else if (selectedTeamId && !isTeamSelected) nodeClass = dimColor;

        return (
          <button
            key={player.player_id}
            type="button"
            disabled={!clickable}
            onClick={() => onSelectPlayer(player.player_id, teamId)}
            className={[
              "group absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150",
              clickable ? "cursor-pointer hover:scale-110 hover:z-20" : "cursor-default",
              isHighlighted ? "z-20" : "z-10",
            ].join(" ")}
            style={{ top: slot.top, left: slot.left }}
            title={player.player_name}
          >
            <span className={[
              "relative flex h-7 w-7 items-center justify-center rounded-full border text-[9px] font-extrabold shadow-md transition-all",
              nodeClass,
            ].join(" ")}>
              {initials(player.player_name, player.player_nickname)}
              <EventBadge stats={playerStats} />
            </span>
            {/* Tooltip name on hover */}
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-[10px] font-semibold text-white shadow-xl group-hover:block">
              {firstName(player.player_name, player.player_nickname)}
            </span>
          </button>
        );
      })}

      {/* ─── Overlay hint when no action selected ─── */}
      {!activeAction && !disabled && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3">
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] text-white/30 backdrop-blur-sm">
            selecione um evento para usar o campo
          </span>
        </div>
      )}
    </div>
  );
}
