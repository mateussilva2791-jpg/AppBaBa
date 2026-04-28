"use client";

import type { LiveTeam, MatchEventDetail, MatchEventType, LiveTeamPlayer } from "@/lib/types";

/* ── Stats ────────────────────────────────────────────────────────── */
type Stats = { goals: number; assists: number; yellowCards: number; redCards: number };

function buildStats(events: MatchEventDetail[]): Map<string, Stats> {
  const z = (): Stats => ({ goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
  const m = new Map<string, Stats>();
  for (const e of events.filter((x) => !x.is_reverted)) {
    if (e.event_type === "GOAL"        && e.player_id) { const s = m.get(e.player_id) ?? z(); s.goals++;       m.set(e.player_id, s); }
    if (e.event_type === "ASSIST"      && e.player_id) { const s = m.get(e.player_id) ?? z(); s.assists++;     m.set(e.player_id, s); }
    if (e.event_type === "YELLOW_CARD" && e.player_id) { const s = m.get(e.player_id) ?? z(); s.yellowCards++; m.set(e.player_id, s); }
    if (e.event_type === "RED_CARD"    && e.player_id) { const s = m.get(e.player_id) ?? z(); s.redCards++;    m.set(e.player_id, s); }
  }
  return m;
}

/* ── Position helpers ─────────────────────────────────────────────── */
type PosGroup = "gk" | "def" | "mid" | "fwd";

function classify(pos: string | null | undefined): PosGroup {
  const p = (pos ?? "").toUpperCase();
  if (/GOL|GK/.test(p))                     return "gk";
  if (/ZAG|LAT|DEF|LIB|CB|FB|LD|LE/.test(p)) return "def";
  if (/MEI|VOL|MID|MEC|CM|MC/.test(p))      return "mid";
  if (/ATA|ATK|FWD|CA|SS|CF|LW|RW/.test(p)) return "fwd";
  return "mid";
}

function groupByPos(players: LiveTeamPlayer[]) {
  const g: Record<PosGroup, LiveTeamPlayer[]> = { gk: [], def: [], mid: [], fwd: [] };
  for (const p of players) g[classify(p.position)].push(p);
  return g;
}

/* ── Grid placement ───────────────────────────────────────────────── */
type Placed = { player: LiveTeamPlayer; top: number; left: number; jersey: number; teamId: string };

function spreadX(count: number, idx: number, pad = 16): number {
  if (count === 1) return 50;
  return pad + (idx / (count - 1)) * (100 - pad * 2);
}

const ZONE_HOME: Record<number, number[]> = {
  1: [84],
  2: [60, 84],
  3: [50, 68, 84],
  4: [49, 62, 74, 85],
  5: [47, 58, 68, 77, 86],
  6: [46, 55, 64, 72, 80, 87],
};
const ZONE_AWAY: Record<number, number[]> = {
  1: [16],
  2: [16, 40],
  3: [16, 32, 50],
  4: [15, 26, 38, 51],
  5: [14, 23, 32, 42, 53],
  6: [13, 20, 28, 36, 44, 54],
};

function computePlacement(players: LiveTeamPlayer[], side: "home" | "away", teamId: string): Placed[] {
  if (!players.length) return [];

  const hasPos = players.some((p) => !!p.position);
  let rows: LiveTeamPlayer[][];

  if (!hasPos) {
    const n = players.length;
    const a = Math.ceil(n / 3);
    const b = Math.ceil((n - a) / 2);
    rows = [players.slice(0, a), players.slice(a, a + b), players.slice(a + b)].filter((r) => r.length > 0);
    if (side === "away") rows = [...rows].reverse();
  } else {
    const g = groupByPos(players);
    const order: PosGroup[] = side === "home" ? ["fwd", "mid", "def", "gk"] : ["gk", "def", "mid", "fwd"];
    rows = order.map((k) => g[k]).filter((r) => r.length > 0);
  }

  const nRows = rows.length;
  const zones = side === "home" ? ZONE_HOME : ZONE_AWAY;
  const ys: number[] = zones[nRows] ?? rows.map((_, i) =>
    side === "home" ? 48 + i * 40 / Math.max(nRows - 1, 1) : 12 + i * 42 / Math.max(nRows - 1, 1),
  );

  const result: Placed[] = [];
  let jersey = 1;
  for (let ri = 0; ri < rows.length; ri++) {
    const y = ys[ri] ?? (side === "home" ? 84 : 16);
    for (let pi = 0; pi < rows[ri].length; pi++) {
      result.push({ player: rows[ri][pi], top: y, left: spreadX(rows[ri].length, pi), jersey: jersey++, teamId });
    }
  }
  return result;
}

function nick(p: LiveTeamPlayer): string {
  if (p.player_nickname) return p.player_nickname.slice(0, 9);
  const parts = p.player_name.trim().split(" ");
  return (parts[0] ?? "").slice(0, 9);
}

/* ── Player Pin ───────────────────────────────────────────────────── */
function Pin({
  placed, side, stats, clickable, highlighted, onClick,
}: {
  placed: Placed;
  side: "home" | "away";
  stats: Stats;
  clickable: boolean;
  highlighted: boolean;
  onClick: () => void;
}) {
  const expelled = stats.redCards > 0 || stats.yellowCards >= 2;

  // Colors
  const homeBg   = highlighted ? "linear-gradient(145deg,#ffe566,#f0b429)" : "linear-gradient(145deg,#f5c842,#d49a18)";
  const awayBg   = highlighted ? "linear-gradient(145deg,#5bc8f5,#2d8ed4)" : "linear-gradient(145deg,#3b9dd4,#1d6fa8)";
  const expelBg  = "linear-gradient(145deg,#ef4444,#b91c1c)";

  const bg       = expelled ? expelBg : side === "home" ? homeBg : awayBg;
  const glow     = highlighted
    ? side === "home"
      ? "0 0 0 2.5px #fff, 0 0 16px rgba(240,180,32,0.9), 0 4px 12px rgba(0,0,0,0.6)"
      : "0 0 0 2.5px #fff, 0 0 16px rgba(56,178,240,0.9), 0 4px 12px rgba(0,0,0,0.6)"
    : "0 2px 8px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.18)";

  // Badge top-right
  let badge: React.ReactNode = null;
  if (expelled) {
    badge = (
      <span style={{
        position: "absolute", top: -4, right: -4,
        width: 13, height: 13, borderRadius: "50%",
        background: "#fff", border: "1.5px solid #b91c1c",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 900, color: "#b91c1c", lineHeight: 1,
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
      }}>✕</span>
    );
  } else if (stats.yellowCards === 1) {
    badge = (
      <span style={{
        position: "absolute", top: -4, right: -4,
        width: 10, height: 13, borderRadius: 2,
        background: "#facc15",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(0,0,0,0.25)",
      }} />
    );
  } else if (stats.goals > 0) {
    badge = (
      <span style={{
        position: "absolute", top: -5, right: -5,
        width: 14, height: 14, borderRadius: "50%",
        background: "rgba(255,255,255,0.96)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.4), 0 0 0 1.5px rgba(0,0,0,0.1)",
      }}>⚽</span>
    );
  }

  return (
    <div style={{
      position: "absolute",
      top: `${placed.top}%`,
      left: `${placed.left}%`,
      transform: "translate(-50%, -50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      zIndex: 10,
    }}>
      <button
        type="button"
        disabled={!clickable}
        onClick={onClick}
        title={placed.player.player_name}
        style={{
          position: "relative",
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: bg,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
          color: expelled ? "#fff" : side === "home" ? "#1a1000" : "#fff",
          cursor: clickable ? "pointer" : "default",
          transition: "transform 0.13s ease, box-shadow 0.13s ease",
          boxShadow: glow,
          letterSpacing: "-0.5px",
        }}
        onMouseEnter={(e) => { if (clickable) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.2)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {expelled ? "✕" : placed.jersey}
        {badge}
      </button>

      {/* Name pill */}
      <span style={{
        background: "rgba(0,0,0,0.62)",
        backdropFilter: "blur(4px)",
        borderRadius: 99,
        padding: "1px 5px",
        fontSize: 7,
        fontWeight: 700,
        color: expelled ? "#fca5a5" : side === "home" ? "#fde68a" : "#bae6fd",
        maxWidth: 44,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: 1.5,
        border: `1px solid ${expelled ? "rgba(239,68,68,0.3)" : side === "home" ? "rgba(240,180,32,0.25)" : "rgba(56,178,240,0.25)"}`,
      }}>
        {nick(placed.player)}
      </span>
    </div>
  );
}

/* ── Field SVG ────────────────────────────────────────────────────── */
function FieldSVG() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Grass stripes */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <rect key={i} x="0" y={i * 12.5} width="100" height="12.5"
          fill={i % 2 === 0 ? "rgba(0,0,0,0.055)" : "rgba(255,255,255,0.018)"} />
      ))}
      {/* Outer border */}
      <rect x="3" y="2" width="94" height="96" rx="0.5" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.55"/>
      {/* Halfway line */}
      <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,0.28)" strokeWidth="0.55"/>
      {/* Centre circle */}
      <circle cx="50" cy="50" r="11" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.55"/>
      <circle cx="50" cy="50" r="1.3" fill="rgba(255,255,255,0.6)"/>
      {/* HOME penalty area */}
      <rect x="22" y="78" width="56" height="20" rx="0.3" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
      <rect x="35" y="90" width="30" height="8" rx="0.3" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.4"/>
      <circle cx="50" cy="85" r="0.7" fill="rgba(255,255,255,0.4)"/>
      <path d="M35 78 A10 10 0 0 0 65 78" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.4"/>
      {/* AWAY penalty area */}
      <rect x="22" y="2"  width="56" height="20" rx="0.3" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
      <rect x="35" y="2"  width="30" height="8"  rx="0.3" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.4"/>
      <circle cx="50" cy="15" r="0.7" fill="rgba(255,255,255,0.4)"/>
      <path d="M35 22 A10 10 0 0 1 65 22" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.4"/>
      {/* Goals */}
      <rect x="40" y="97.5" width="20" height="2.5" rx="0.3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.38)" strokeWidth="0.5"/>
      <rect x="40" y="0"    width="20" height="2.5" rx="0.3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.38)" strokeWidth="0.5"/>
      {/* Corner arcs */}
      <path d="M3 5 A3 3 0 0 1 6 2"    fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="0.4"/>
      <path d="M94 2 A3 3 0 0 1 97 5"  fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="0.4"/>
      <path d="M97 95 A3 3 0 0 1 94 98" fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="0.4"/>
      <path d="M6 98 A3 3 0 0 1 3 95"  fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="0.4"/>
    </svg>
  );
}

/* ── Team label ───────────────────────────────────────────────────── */
function TeamLabel({ name, side }: { name: string; side: "home" | "away" }) {
  const isHome = side === "home";
  return (
    <div style={{
      position: "absolute",
      [isHome ? "bottom" : "top"]: 0,
      left: 0, right: 0,
      display: "flex",
      justifyContent: "center",
      paddingBottom: isHome ? 5 : 0,
      paddingTop: isHome ? 0 : 5,
      zIndex: 20,
      pointerEvents: "none",
    }}>
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: isHome ? "rgba(100,60,0,0.82)" : "rgba(10,45,90,0.82)",
        border: `1px solid ${isHome ? "rgba(240,180,32,0.4)" : "rgba(59,157,212,0.4)"}`,
        borderRadius: 99,
        padding: "2px 9px",
        fontSize: 8,
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: isHome ? "rgba(255,220,100,0.95)" : "rgba(160,215,255,0.95)",
        backdropFilter: "blur(6px)",
        boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
        whiteSpace: "nowrap",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: isHome ? "#f0b429" : "#38b2f0",
          display: "inline-block", flexShrink: 0,
        }} />
        {name}
      </span>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
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
  const statsMap = buildStats(events);
  const clickable = !disabled && !!activeAction;

  const homePlaced = homeTeam ? computePlacement(homeTeam.players, "home", homeTeam.id) : [];
  const awayPlaced = awayTeam ? computePlacement(awayTeam.players, "away", awayTeam.id) : [];

  function renderPin(p: Placed, side: "home" | "away") {
    const canClick = clickable && (selectedTeamId === null || selectedTeamId === p.teamId);
    return (
      <Pin
        key={p.player.player_id}
        placed={p}
        side={side}
        stats={statsMap.get(p.player.player_id) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }}
        clickable={canClick}
        highlighted={highlightedPlayerId === p.player.player_id}
        onClick={() => onSelectPlayer(p.player.player_id, p.teamId)}
      />
    );
  }

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: 360,
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      background: "linear-gradient(180deg,#185224 0%,#1c6230 18%,#1b6030 50%,#1c6230 82%,#185224 100%)",
    }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <FieldSVG />

        {awayTeam && <TeamLabel name={awayTeam.name} side="away" />}
        {homeTeam && <TeamLabel name={homeTeam.name} side="home" />}

        {awayPlaced.map((p) => renderPin(p, "away"))}
        {homePlaced.map((p) => renderPin(p, "home"))}

        {/* Overlay de ação ativa */}
        {activeAction && !disabled && (
          <div style={{
            position: "absolute", inset: 0,
            border: "2px solid rgba(240,180,32,0.25)",
            borderRadius: 14,
            pointerEvents: "none",
            boxShadow: "inset 0 0 40px rgba(240,180,32,0.06)",
          }} />
        )}
      </div>
    </div>
  );
}
