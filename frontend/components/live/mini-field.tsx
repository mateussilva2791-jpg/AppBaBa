"use client";

import type { LiveTeam, MatchEventDetail, MatchEventType, LiveTeamPlayer } from "@/lib/types";

/* ── Stats ──────────────────────────────────────────────────────── */
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

/* ── Position helpers ───────────────────────────────────────────── */
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

/* ── Compute grid placement ─────────────────────────────────────── */
// Returns players with their % position on the field (top, left)
type Placed = { player: LiveTeamPlayer; top: number; left: number; jersey: number; teamId: string };

// Spread N items evenly between leftPad% and rightPad%
function spreadX(count: number, idx: number, pad = 14): number {
  if (count === 1) return 50;
  return pad + (idx / (count - 1)) * (100 - pad * 2);
}

// Y zones per row count
//   home side: rows are ordered fwd→gk, fwd is near midline, gk is at bottom
//   away side: rows are ordered gk→fwd, gk is at top, fwd near midline
const ZONE_HOME: Record<number, number[]> = {
  1: [85],
  2: [58, 86],
  3: [49, 69, 87],
  4: [48, 62, 76, 88],
  5: [46, 58, 68, 78, 88],
  6: [45, 55, 64, 73, 81, 89],
};
const ZONE_AWAY: Record<number, number[]> = {
  1: [15],
  2: [14, 42],
  3: [13, 31, 51],
  4: [12, 24, 37, 52],
  5: [11, 22, 33, 42, 54],
  6: [11, 19, 28, 37, 45, 55],
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
    const y = ys[ri] ?? (side === "home" ? 85 : 15);
    for (let pi = 0; pi < rows[ri].length; pi++) {
      result.push({ player: rows[ri][pi], top: y, left: spreadX(rows[ri].length, pi), jersey: jersey++, teamId });
    }
  }
  return result;
}

function nick(p: LiveTeamPlayer): string {
  if (p.player_nickname) return p.player_nickname.slice(0, 8);
  return p.player_name.trim().split(" ")[0].slice(0, 8);
}

/* ── Player pin ─────────────────────────────────────────────────── */
function Pin({
  placed,
  side,
  stats,
  clickable,
  highlighted,
  onClick,
}: {
  placed: Placed;
  side: "home" | "away";
  stats: Stats;
  clickable: boolean;
  highlighted: boolean;
  onClick: () => void;
}) {
  // Visual states
  const homeBase   = "bg-[#e8b320] border-[#f5c842] text-[#1a1200]";
  const homeGlow   = "bg-[#ffe066] border-white text-[#1a1200] shadow-[0_0_18px_rgba(240,180,32,0.85)]";
  const awayBase   = "bg-[#1d6fa8] border-[#3b9dd4] text-white";
  const awayGlow   = "bg-[#38b2f0] border-white text-white shadow-[0_0_18px_rgba(56,178,240,0.85)]";

  const base      = side === "home" ? homeBase : awayBase;
  const glowClass = side === "home" ? homeGlow : awayGlow;

  // Stat indicator
  let badge: React.ReactNode = null;
  if (stats.redCards)    badge = <span style={{ position:"absolute", top:-5, right:-5, fontSize:9, fontWeight:900, background:"#ef4444", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", boxShadow:"0 0 0 1.5px rgba(0,0,0,0.4)" }}>✕</span>;
  else if (stats.yellowCards) badge = <span style={{ position:"absolute", top:-5, right:-5, width:14, height:14, background:"#facc15", borderRadius:3, boxShadow:"0 0 0 1.5px rgba(0,0,0,0.4)" }} />;
  else if (stats.goals)  badge = <span style={{ position:"absolute", top:-5, right:-5, fontSize:9, background:"rgba(255,255,255,0.95)", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 0 1.5px rgba(0,0,0,0.2)" }}>⚽</span>;

  return (
    <div
      style={{
        position: "absolute",
        top: `${placed.top}%`,
        left: `${placed.left}%`,
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        zIndex: 10,
      }}
    >
      <button
        type="button"
        disabled={!clickable}
        onClick={onClick}
        title={placed.player.player_name}
        style={{
          position: "relative",
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: "2px solid",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 800,
          cursor: clickable ? "pointer" : "default",
          transition: "transform 0.12s, opacity 0.12s",
          boxShadow: "0 3px 10px rgba(0,0,0,0.55)",
        }}
        className={highlighted ? glowClass : base}
        onMouseEnter={(e) => { if (clickable) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.18)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {placed.jersey}
        {badge}
      </button>
      <span
        style={{
          fontSize: 7.5,
          fontWeight: 600,
          color: "rgba(255,255,255,0.82)",
          maxWidth: 36,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textShadow: "0 1px 4px rgba(0,0,0,1)",
          lineHeight: 1,
        }}
      >
        {nick(placed.player)}
      </span>
    </div>
  );
}

/* ── Grass stripe SVG overlay ───────────────────────────────────── */
function FieldSVG() {
  return (
    <svg
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Alternating stripes */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <rect key={i} x="0" y={i*12.5} width="100" height="12.5"
          fill={i%2===0 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.022)"} />
      ))}
      {/* Outer border */}
      <rect x="3" y="2" width="94" height="96" rx="0.5" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="0.6"/>
      {/* Halfway */}
      <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,0.30)" strokeWidth="0.6"/>
      {/* Centre circle */}
      <circle cx="50" cy="50" r="11" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="0.6"/>
      <circle cx="50" cy="50" r="1.4" fill="rgba(255,255,255,0.55)"/>
      {/* HOME penalty area */}
      <rect x="23" y="79" width="54" height="19" rx="0.3" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5"/>
      <rect x="36" y="91" width="28" height="7" rx="0.3" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.4"/>
      <circle cx="50" cy="86" r="0.7" fill="rgba(255,255,255,0.38)"/>
      <path d="M 36 79 A 10 10 0 0 0 64 79" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.4"/>
      {/* AWAY penalty area */}
      <rect x="23" y="2"  width="54" height="19" rx="0.3" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5"/>
      <rect x="36" y="2"  width="28" height="7"  rx="0.3" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.4"/>
      <circle cx="50" cy="14" r="0.7" fill="rgba(255,255,255,0.38)"/>
      <path d="M 36 21 A 10 10 0 0 1 64 21" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.4"/>
      {/* Goals */}
      <rect x="39" y="97.5" width="22" height="2.5" rx="0.3" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.40)" strokeWidth="0.5"/>
      <rect x="39" y="0"    width="22" height="2.5" rx="0.3" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.40)" strokeWidth="0.5"/>
      {/* Corner arcs */}
      <path d="M3 5 A3 3 0 0 1 6 2"   fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.45"/>
      <path d="M94 2 A3 3 0 0 1 97 5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.45"/>
      <path d="M97 95 A3 3 0 0 1 94 98" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.45"/>
      <path d="M6 98 A3 3 0 0 1 3 95"  fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.45"/>
    </svg>
  );
}

/* ── Main ───────────────────────────────────────────────────────── */
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
        stats={statsMap.get(p.player.player_id) ?? { goals:0, assists:0, yellowCards:0, redCards:0 }}
        clickable={canClick}
        highlighted={highlightedPlayerId === p.player.player_id}
        onClick={() => onSelectPlayer(p.player.player_id, p.teamId)}
      />
    );
  }

  return (
    /* Outer wrapper — portrait aspect ratio 3:4 */
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: "133.33%", /* 4/3 = portrait */
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.09)",
        background: "linear-gradient(180deg,#1a5828 0%,#1d6b32 20%,#1b6430 50%,#1d6b32 80%,#1a5828 100%)",
      }}
    >
      {/* Inner absolutely-fills wrapper so children can use % coords */}
      <div style={{ position:"absolute", inset:0 }}>
        <FieldSVG />

        {/* Away team label */}
        {awayTeam && (
          <div style={{ position:"absolute", top:10, left:"50%", transform:"translateX(-50%)", zIndex:20, pointerEvents:"none" }}>
            <span style={{
              display:"inline-block",
              background:"rgba(29,95,160,0.75)",
              border:"1px solid rgba(59,157,212,0.35)",
              borderRadius:99,
              padding:"2px 10px",
              fontSize:8,
              fontWeight:700,
              letterSpacing:"0.18em",
              textTransform:"uppercase",
              color:"rgba(178,220,255,0.9)",
              backdropFilter:"blur(4px)",
              whiteSpace:"nowrap",
            }}>
              {awayTeam.name}
            </span>
          </div>
        )}

        {/* Home team label */}
        {homeTeam && (
          <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", zIndex:20, pointerEvents:"none" }}>
            <span style={{
              display:"inline-block",
              background:"rgba(120,80,0,0.75)",
              border:"1px solid rgba(240,180,32,0.35)",
              borderRadius:99,
              padding:"2px 10px",
              fontSize:8,
              fontWeight:700,
              letterSpacing:"0.18em",
              textTransform:"uppercase",
              color:"rgba(255,220,100,0.92)",
              backdropFilter:"blur(4px)",
              whiteSpace:"nowrap",
            }}>
              {homeTeam.name}
            </span>
          </div>
        )}

        {/* Players */}
        {awayPlaced.map((p) => renderPin(p, "away"))}
        {homePlaced.map((p) => renderPin(p, "home"))}

        {/* Hint */}
        {!activeAction && !disabled && (
          <div style={{ position:"absolute", bottom:32, left:0, right:0, display:"flex", justifyContent:"center", zIndex:30, pointerEvents:"none" }}>
            <span style={{ background:"rgba(0,0,0,0.38)", borderRadius:99, padding:"3px 12px", fontSize:8, color:"rgba(255,255,255,0.28)", backdropFilter:"blur(2px)" }}>
              selecione um evento para registrar no campo
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
