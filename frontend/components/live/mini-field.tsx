"use client";

import type { LiveTeam, MatchEventDetail, MatchEventType, LiveTeamPlayer } from "@/lib/types";


/* ── Stats ───────────────────────────────────────────────── */
type Stats = { goals: number; assists: number; yellowCards: number; redCards: number };

function buildStats(events: MatchEventDetail[]): Map<string, Stats> {
  const z = (): Stats => ({ goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
  const m = new Map<string, Stats>();
  for (const e of events.filter((ev) => !ev.is_reverted)) {
    if (e.event_type === "GOAL"        && e.player_id) { const s = m.get(e.player_id) ?? z(); s.goals++;       m.set(e.player_id, s); }
    if (e.event_type === "ASSIST"      && e.player_id) { const s = m.get(e.player_id) ?? z(); s.assists++;     m.set(e.player_id, s); }
    if (e.event_type === "YELLOW_CARD" && e.player_id) { const s = m.get(e.player_id) ?? z(); s.yellowCards++; m.set(e.player_id, s); }
    if (e.event_type === "RED_CARD"    && e.player_id) { const s = m.get(e.player_id) ?? z(); s.redCards++;    m.set(e.player_id, s); }
  }
  return m;
}

/* ── Position grouping ───────────────────────────────────── */
type PosGroup = "gk" | "def" | "mid" | "fwd";

function classify(pos: string | null | undefined): PosGroup {
  const p = (pos ?? "").toUpperCase();
  if (/GOL|GK/.test(p)) return "gk";
  if (/ZAG|LAT|DEF|LIB|CB|FB|LD|LE/.test(p)) return "def";
  if (/MEI|VOL|MID|MEC|CM|MC/.test(p)) return "mid";
  if (/ATA|ATK|FWD|CA|SS|CF|LW|RW/.test(p)) return "fwd";
  return "mid";
}

function groupByPos(players: LiveTeamPlayer[]): Record<PosGroup, LiveTeamPlayer[]> {
  const g: Record<PosGroup, LiveTeamPlayer[]> = { gk: [], def: [], mid: [], fwd: [] };
  for (const p of players) g[classify(p.position)].push(p);
  return g;
}

// Returns formation rows top→bottom for the given half
function getRows(players: LiveTeamPlayer[], side: "home" | "away"): LiveTeamPlayer[][] {
  const hasPos = players.some((p) => !!p.position);

  if (!hasPos) {
    // No position data: split into 3 roughly equal rows
    const n = players.length;
    const a = Math.ceil(n / 3);
    const b = Math.ceil((n - a) / 2);
    const rows = [players.slice(0, a), players.slice(a, a + b), players.slice(a + b)];
    return side === "home" ? rows : [...rows].reverse();
  }

  const g = groupByPos(players);
  // home: FWD → MID → DEF → GK  (attack faces up, GK at bottom)
  // away: GK → DEF → MID → FWD  (attack faces down, GK at top)
  const order: PosGroup[] = side === "home"
    ? ["fwd", "mid", "def", "gk"]
    : ["gk", "def", "mid", "fwd"];
  return order.map((k) => g[k]).filter((r) => r.length > 0);
}

function shortName(player: LiveTeamPlayer) {
  if (player.player_nickname) return player.player_nickname.slice(0, 10);
  const parts = player.player_name.trim().split(" ");
  return parts[0].slice(0, 10);
}

function posLabel(pos: string | null | undefined) {
  return (pos ?? "?").toUpperCase().slice(0, 3);
}

/* ── Stat badge ──────────────────────────────────────────── */
function StatBadge({ s }: { s: Stats }) {
  if (s.redCards)    return <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-1 ring-black/40">✕</span>;
  if (s.yellowCards) return <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded bg-yellow-400 ring-1 ring-black/40" />;
  if (s.goals)       return <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-[9px] ring-1 ring-black/20">⚽</span>;
  return null;
}

/* ── Player dot ──────────────────────────────────────────── */
function PlayerDot({
  player,
  side,
  stats,
  clickable,
  highlighted,
  onClick,
}: {
  player: LiveTeamPlayer;
  side: "home" | "away";
  stats: Stats;
  clickable: boolean;
  highlighted: boolean;
  onClick: () => void;
}) {
  const base = side === "home"
    ? "bg-emerald-700 border-emerald-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
    : "bg-sky-700 border-sky-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)]";

  const lit = side === "home"
    ? "bg-emerald-500 border-white shadow-[0_0_14px_rgba(74,222,128,0.5)]"
    : "bg-sky-500 border-white shadow-[0_0_14px_rgba(96,165,250,0.5)]";

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={!clickable}
        onClick={onClick}
        title={player.player_name}
        className={[
          "relative flex h-11 w-11 items-center justify-center rounded-full border-2 text-[11px] font-extrabold text-white transition-all duration-150",
          highlighted ? lit : base,
          clickable
            ? "cursor-pointer hover:scale-[1.12] hover:border-white hover:brightness-125"
            : "cursor-default opacity-80",
        ].join(" ")}
      >
        {posLabel(player.position)}
        <StatBadge s={stats} />
      </button>
      <span className="max-w-[48px] truncate text-center text-[9px] font-semibold leading-none text-white/65">
        {shortName(player)}
      </span>
    </div>
  );
}


/* ── Main export ─────────────────────────────────────────── */
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
  const stats = buildStats(events);
  const clickable = !disabled && !!activeAction;

  const homeRows = homeTeam ? getRows(homeTeam.players, "home") : [];
  const awayRows = awayTeam ? getRows(awayTeam.players, "away") : [];

  // Attach teamId to each player so the generic handler can pass it up
  function tagTeam(players: LiveTeamPlayer[], teamId: string) {
    return players.map((p) => Object.assign({}, p, { _teamId: teamId }));
  }

  function renderRows(rows: LiveTeamPlayer[][], teamId: string, side: "home" | "away") {
    return rows.map((row, i) => (
      <div key={i} className="flex justify-center gap-2">
        {tagTeam(row, teamId).map((p) => (
          <PlayerDot
            key={p.player_id}
            player={p}
            side={side}
            stats={stats.get(p.player_id) ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }}
            clickable={clickable && (selectedTeamId === null || selectedTeamId === teamId)}
            highlighted={highlightedPlayerId === p.player_id}
            onClick={() => onSelectPlayer(p.player_id, teamId)}
          />
        ))}
      </div>
    ));
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/8"
      style={{
        background: "linear-gradient(180deg,#1b5e2e 0%,#1e6e34 30%,#1a6630 50%,#1e6e34 70%,#1b5e2e 100%)",
      }}
    >
      {/* ─── Field lines (SVG) ─── */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Outer border */}
        <rect x="2" y="1.5" width="96" height="97" rx="1" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" />
        {/* Halfway line */}
        <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        {/* Center circle */}
        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" />
        {/* Center spot */}
        <circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.25)" />
        {/* Home penalty area */}
        <rect x="22" y="78" width="56" height="20" rx="0.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        {/* Away penalty area */}
        <rect x="22" y="2" width="56" height="20" rx="0.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
        {/* Home goal */}
        <rect x="37" y="96" width="26" height="3" rx="0.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        {/* Away goal */}
        <rect x="37" y="1" width="26" height="3" rx="0.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        {/* Alternating grass stripes (subtle) */}
        {[0,2,4,6,8].map((i) => (
          <rect key={i} x="0" y={i * 10} width="100" height="10" fill="rgba(0,0,0,0.04)" />
        ))}
      </svg>

      {/* ─── Content ─── */}
      <div className="relative flex flex-col gap-3 px-4 py-4">
        {/* Away team label */}
        {awayTeam && (
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.22em] text-sky-200/60">
            {awayTeam.name}
          </p>
        )}

        {/* Away rows (top half) */}
        <div className="flex flex-col gap-3">
          {awayTeam ? renderRows(awayRows, awayTeam.id, "away") : null}
        </div>

        {/* Midfield divider */}
        <div className="mx-auto w-8 border-t border-white/20" />

        {/* Home rows (bottom half) */}
        <div className="flex flex-col gap-3">
          {homeTeam ? renderRows(homeRows, homeTeam.id, "home") : null}
        </div>

        {/* Home team label */}
        {homeTeam && (
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-200/60">
            {homeTeam.name}
          </p>
        )}

        {/* No-action hint */}
        {!activeAction && !disabled && (
          <p className="text-center text-[10px] text-white/25">
            selecione um evento para registrar no campo
          </p>
        )}
      </div>
    </div>
  );
}
