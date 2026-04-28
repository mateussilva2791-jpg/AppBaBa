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

function spreadX(count: number, idx: number, pad = 20): number {
  if (count === 1) return 50;
  return pad + (idx / (count - 1)) * (100 - pad * 2);
}

const ZONE_HOME: Record<number, number[]> = {
  1: [83],
  2: [62, 83],
  3: [52, 69, 83],
  4: [50, 63, 74, 84],
  5: [48, 59, 69, 78, 85],
  6: [47, 56, 65, 73, 81, 87],
};
const ZONE_AWAY: Record<number, number[]> = {
  1: [17],
  2: [17, 38],
  3: [17, 31, 48],
  4: [16, 27, 38, 50],
  5: [15, 24, 33, 42, 52],
  6: [14, 21, 29, 37, 46, 55],
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
    side === "home" ? 50 + i * 38 / Math.max(nRows - 1, 1) : 14 + i * 40 / Math.max(nRows - 1, 1),
  );

  const result: Placed[] = [];
  let jersey = 1;
  for (let ri = 0; ri < rows.length; ri++) {
    const y = ys[ri] ?? (side === "home" ? 83 : 17);
    for (let pi = 0; pi < rows[ri].length; pi++) {
      result.push({ player: rows[ri][pi], top: y, left: spreadX(rows[ri].length, pi), jersey: jersey++, teamId });
    }
  }
  return result;
}

function nick(p: LiveTeamPlayer): string {
  if (p.player_nickname) return p.player_nickname.slice(0, 8);
  const parts = p.player_name.trim().split(" ");
  return (parts[0] ?? "").slice(0, 8);
}

/* ── Cartoon Player Pin ───────────────────────────────────────────── */
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

  const homeColor   = "#F5C518";
  const homeDark    = "#8B6800";
  const homeText    = "#1a1000";
  const awayColor   = "#38BFFA";
  const awayDark    = "#0A4F7A";
  const awayText    = "#fff";
  const expelColor  = "#F23636";
  const expelDark   = "#7A0A0A";

  const pinColor  = expelled ? expelColor  : side === "home" ? homeColor  : awayColor;
  const pinDark   = expelled ? expelDark   : side === "home" ? homeDark   : awayDark;
  const textColor = expelled ? "#fff"      : side === "home" ? homeText   : awayText;

  // Badge top-right
  let badge: React.ReactNode = null;
  if (expelled) {
    badge = (
      <span style={{
        position: "absolute", top: -5, right: -5,
        width: 15, height: 15, borderRadius: "50%",
        background: "#fff", border: `2px solid ${expelDark}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 900, color: expelDark, lineHeight: 1,
      }}>✕</span>
    );
  } else if (stats.yellowCards === 1) {
    badge = (
      <span style={{
        position: "absolute", top: -5, right: -4,
        width: 9, height: 13, borderRadius: 2,
        background: "#FACC15",
        border: "2px solid #78350f",
      }} />
    );
  } else if (stats.goals > 0) {
    badge = (
      <span style={{
        position: "absolute", top: -6, right: -6,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9,
        border: "2px solid rgba(0,0,0,0.15)",
      }}>⚽</span>
    );
  }

  const glowShadow = highlighted
    ? `3px 3px 0 ${pinDark}, 0 0 18px ${pinColor}cc`
    : `3px 3px 0 ${pinDark}`;

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
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: highlighted
            ? `radial-gradient(circle at 38% 32%, ${pinColor}ff, ${pinColor}bb)`
            : `radial-gradient(circle at 38% 32%, ${pinColor}ee, ${pinColor}99)`,
          border: `3px solid ${pinDark}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 900,
          color: textColor,
          cursor: clickable ? "pointer" : "default",
          transition: "transform 0.12s ease",
          boxShadow: glowShadow,
          letterSpacing: "-0.5px",
          // inner highlight
          outline: `1.5px solid rgba(255,255,255,${highlighted ? 0.55 : 0.25})`,
          outlineOffset: "-4px",
        }}
        onMouseEnter={(e) => { if (clickable) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.18) translateY(-2px)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {expelled ? "✕" : placed.jersey}
        {badge}
      </button>

      {/* Cartoon name chip */}
      <span style={{
        background: `${pinDark}ee`,
        borderRadius: 99,
        padding: "1.5px 6px",
        fontSize: 7.5,
        fontWeight: 800,
        color: expelled ? "#fca5a5" : side === "home" ? "#fff7cc" : "#e0f4ff",
        maxWidth: 52,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: 1.6,
        border: `1.5px solid ${pinColor}88`,
        letterSpacing: "0.02em",
        boxShadow: `1px 1px 0 ${pinDark}`,
      }}>
        {nick(placed.player)}
      </span>
    </div>
  );
}

/* ── Cartoon Field SVG ────────────────────────────────────────────── */
function FieldSVG() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Alternating grass stripes */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <rect key={i} x="0" y={i * 12.5} width="100" height="12.5"
          fill={i % 2 === 0 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.03)"} />
      ))}
      {/* Outer border */}
      <rect x="3.5" y="2.5" width="93" height="95" rx="1" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1"/>
      {/* Halfway line */}
      <line x1="3.5" y1="50" x2="96.5" y2="50" stroke="rgba(255,255,255,0.60)" strokeWidth="0.9"/>
      {/* Centre circle */}
      <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9"/>
      <circle cx="50" cy="50" r="1.6" fill="rgba(255,255,255,0.80)"/>
      {/* HOME penalty area */}
      <rect x="22" y="77" width="56" height="21" rx="0.5" fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth="0.8"/>
      <rect x="35" y="89" width="30" height="9"  rx="0.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7"/>
      <circle cx="50" cy="84" r="0.9" fill="rgba(255,255,255,0.60)"/>
      <path d="M35 77 A11 11 0 0 0 65 77" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.7"/>
      {/* AWAY penalty area */}
      <rect x="22" y="2.5"  width="56" height="21" rx="0.5" fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth="0.8"/>
      <rect x="35" y="2.5"  width="30" height="9"  rx="0.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7"/>
      <circle cx="50" cy="16" r="0.9" fill="rgba(255,255,255,0.60)"/>
      <path d="M35 23.5 A11 11 0 0 1 65 23.5" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.7"/>
      {/* Goals */}
      <rect x="40" y="97.5" width="20" height="2.5" rx="0.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7"/>
      <rect x="40" y="0"    width="20" height="2.5" rx="0.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7"/>
      {/* Corner flags */}
      <circle cx="3.5"  cy="2.5"  r="1.2" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6"/>
      <circle cx="96.5" cy="2.5"  r="1.2" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6"/>
      <circle cx="3.5"  cy="97.5" r="1.2" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6"/>
      <circle cx="96.5" cy="97.5" r="1.2" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6"/>
    </svg>
  );
}

/* ── Cartoon Team Label ───────────────────────────────────────────── */
function TeamLabel({ name, side }: { name: string; side: "home" | "away" }) {
  const isHome = side === "home";
  const color  = isHome ? "#F5C518" : "#38BFFA";
  const dark   = isHome ? "#8B6800" : "#0A4F7A";
  const textC  = isHome ? "#fff8e1" : "#e0f6ff";

  return (
    <div style={{
      position: "absolute",
      [isHome ? "bottom" : "top"]: 6,
      left: 0, right: 0,
      display: "flex",
      justifyContent: "center",
      zIndex: 20,
      pointerEvents: "none",
    }}>
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: `${dark}f0`,
        border: `2px solid ${color}`,
        borderRadius: 99,
        padding: "3px 10px",
        fontSize: 8.5,
        fontWeight: 900,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: textC,
        boxShadow: `2px 2px 0 rgba(0,0,0,0.4)`,
        whiteSpace: "nowrap",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: color,
          display: "inline-block", flexShrink: 0,
          boxShadow: `0 0 6px ${color}`,
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
      height: 380,
      borderRadius: 18,
      overflow: "hidden",
      border: "3px solid rgba(0,0,0,0.35)",
      boxShadow: "4px 4px 0 rgba(0,0,0,0.35), 0 8px 32px rgba(0,0,0,0.45)",
      background: "linear-gradient(180deg,#1a7a32 0%,#1f9040 18%,#1d8a3c 50%,#1f9040 82%,#1a7a32 100%)",
    }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <FieldSVG />
        {awayTeam && <TeamLabel name={awayTeam.name} side="away" />}
        {homeTeam && <TeamLabel name={homeTeam.name} side="home" />}
        {awayPlaced.map((p) => renderPin(p, "away"))}
        {homePlaced.map((p) => renderPin(p, "home"))}

        {/* Borda de acao ativa */}
        {activeAction && !disabled && (
          <div style={{
            position: "absolute", inset: 0,
            border: "3px solid rgba(245,197,24,0.5)",
            borderRadius: 15,
            pointerEvents: "none",
            boxShadow: "inset 0 0 30px rgba(245,197,24,0.08)",
          }} />
        )}
      </div>
    </div>
  );
}
