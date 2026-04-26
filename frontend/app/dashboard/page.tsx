"use client";

import type { ReactNode } from "react";

import { MiniBarChart } from "@/components/ui/mini-bar-chart";
import { RankList, type RankListEntry } from "@/components/ui/rank-list";
import { StatCard } from "@/components/ui/stat-card";

// ── Types ────────────────────────────────────────────────────────────────────

type Position = "GK" | "DEF" | "MID" | "FWD";

type FieldPlayer = {
  id: string;
  initials: string;
  name: string;
  subInfo: string;
  points: number;
  position: Position;
  isCaptain?: boolean;
};

type HighlightPlayer = {
  initials: string;
  name: string;
  position: Position;
  points: number;
  delta: string;
};

type Transfer = {
  initials: string;
  name: string;
  position: Position;
  direction: "in" | "out";
  value: string;
};

// ── Design tokens ────────────────────────────────────────────────────────────

const POS_COLOR: Record<Position, string> = {
  GK:  "#4ade80",
  DEF: "#60a5fa",
  MID: "#a78bfa",
  FWD: "#f87171",
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const STAT_CARDS = [
  { label: "Uptime",          value: "99.8%",  sublabel: "+0.1% vs semana passada", tone: "positive" as const },
  { label: "Usuários ativos", value: "1.247",  sublabel: "+32 hoje",                tone: "positive" as const },
  { label: "Latência média",  value: "142ms",  sublabel: "Meta: <200ms",            tone: "neutral"  as const },
  { label: "Erros 24h",       value: "3",      sublabel: "↓ 12 vs ontem",           tone: "positive" as const },
];

const FIELD_ROWS: { label: string; position: Position; players: FieldPlayer[] }[] = [
  {
    label: "Atacantes",
    position: "FWD",
    players: [
      { id: "f1", initials: "CR", name: "Carlos R.",  subInfo: "ATA • R$ 28,4", points: 14, position: "FWD" },
      { id: "f2", initials: "LM", name: "Lucas M.",   subInfo: "ATA • R$ 22,1", points:  7, position: "FWD" },
      { id: "f3", initials: "PA", name: "Pedro A.",   subInfo: "ATA • R$ 19,8", points:  3, position: "FWD" },
    ],
  },
  {
    label: "Meias",
    position: "MID",
    players: [
      { id: "m1", initials: "RS", name: "Rafael S.",  subInfo: "MEI • R$ 17,5", points: 12, position: "MID", isCaptain: true },
      { id: "m2", initials: "BF", name: "Bruno F.",   subInfo: "MEI • R$ 15,9", points:  9, position: "MID" },
      { id: "m3", initials: "TG", name: "Thiago G.",  subInfo: "MEI • R$ 14,2", points:  6, position: "MID" },
      { id: "m4", initials: "MR", name: "Marcos R.",  subInfo: "MEI • R$ 12,0", points:  2, position: "MID" },
    ],
  },
  {
    label: "Defensores",
    position: "DEF",
    players: [
      { id: "d1", initials: "JO", name: "João O.",    subInfo: "ZAG • R$ 13,5", points: 11, position: "DEF" },
      { id: "d2", initials: "FN", name: "Felipe N.",  subInfo: "LAT • R$ 11,8", points:  8, position: "DEF" },
      { id: "d3", initials: "DS", name: "Diego S.",   subInfo: "ZAG • R$ 10,5", points:  5, position: "DEF" },
      { id: "d4", initials: "AM", name: "André M.",   subInfo: "LAT • R$ 9,7",  points:  4, position: "DEF" },
    ],
  },
  {
    label: "Goleiro",
    position: "GK",
    players: [
      { id: "g1", initials: "EV", name: "Everton V.", subInfo: "GOL • R$ 16,0", points: 10, position: "GK" },
    ],
  },
];

const ROUND_BARS = [
  { label: "R12", value: 18 },
  { label: "R13", value: 22 },
  { label: "R14", value: 14 },
  { label: "R15", value: 25 },
  { label: "R16", value: 19 },
  { label: "R17", value: 21 },
  { label: "R18", value: 27 },
];

const RANKING: RankListEntry[] = [
  { id: "r1", rank: 1, name: "Time dos Craques",  subInfo: "127 pts", score: 1842 },
  { id: "r2", rank: 2, name: "Esquadrão FC",       subInfo: "124 pts", score: 1798 },
  { id: "me", rank: 3, name: "Meu Time",           subInfo: "122 pts", score: 1756 },
  { id: "r4", rank: 4, name: "Onze Guerreiros",    subInfo: "118 pts", score: 1701 },
  { id: "r5", rank: 5, name: "Bola de Ouro",       subInfo: "115 pts", score: 1688 },
];

const HIGHLIGHTS: HighlightPlayer[] = [
  { initials: "CR", name: "Carlos R.",  position: "FWD", points: 14, delta: "+4.2" },
  { initials: "RS", name: "Rafael S.", position: "MID", points: 12, delta: "+2.8" },
];

const TRANSFERS: Transfer[] = [
  { initials: "PA", name: "Pedro A.",  position: "FWD", direction: "in",  value: "R$ 19,8" },
  { initials: "WL", name: "Wesley L.", position: "DEF", direction: "out", value: "R$ 8,4" },
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function SidebarCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "#1a2e20",
        border: "1px solid #2d4a33",
        borderRadius: 10,
        padding: 14,
      }}
    >
      {title ? (
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: "rgba(240,244,240,0.32)" }}
        >
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Jersey({ player }: { player: FieldPlayer }) {
  const color = POS_COLOR[player.position];
  const ptColor =
    player.points > 10 ? "#4ade80" : player.points > 5 ? "#f0b429" : "#f87171";

  return (
    <div className="flex flex-col items-center" style={{ gap: 10 }}>
      {/* jersey */}
      <div className="relative" style={{ width: 52, height: 52 }}>
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            borderRadius: 10,
            background: "#0f1a14",
            border: `2px solid ${color}`,
            boxShadow: `0 0 10px ${color}28`,
          }}
        >
          <span
            className="font-[family-name:var(--font-manrope)] font-extrabold leading-none"
            style={{ fontSize: 14, color, letterSpacing: "-0.02em" }}
          >
            {player.initials}
          </span>
        </div>

        {/* captain badge */}
        {player.isCaptain ? (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-[17px] w-[17px] items-center justify-center rounded-full font-[family-name:var(--font-manrope)] text-[7px] font-black"
            style={{
              background: "#f0b429",
              color: "#0a1210",
              boxShadow: "0 0 6px rgba(240,180,41,0.55)",
            }}
          >
            C
          </span>
        ) : null}

        {/* points badge */}
        <span
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full font-[family-name:var(--font-manrope)] text-[9px] font-bold leading-none"
          style={{
            background: ptColor,
            color: "#0a1210",
            padding: "2px 5px",
            minWidth: 22,
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {player.points}
        </span>
      </div>

      {/* name + sub-info */}
      <div className="flex flex-col items-center" style={{ marginTop: 4, gap: 2 }}>
        <span
          className="max-w-[68px] truncate text-center font-[family-name:var(--font-manrope)] font-bold leading-none"
          style={{ fontSize: 12, color: "#f0f4f0" }}
        >
          {player.name}
        </span>
        <span
          className="max-w-[68px] truncate text-center leading-none"
          style={{ fontSize: 10, color: "#5a7a5e" }}
        >
          {player.subInfo}
        </span>
      </div>
    </div>
  );
}

function FieldRow({ label, players }: { label: string; players: FieldPlayer[] }) {
  return (
    <div className="flex flex-col items-center gap-3 py-5 px-4">
      <p
        className="text-[9px] font-bold uppercase tracking-[0.26em]"
        style={{ color: "rgba(240,244,240,0.26)" }}
      >
        {label}
      </p>
      <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6">
        {players.map((p) => (
          <Jersey key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}

function HealthCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: 7, padding: "9px 10px" }}>
      <span
        className="block font-[family-name:var(--font-manrope)] text-xl font-extrabold leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <span
        className="mt-0.5 block text-[10px] leading-none"
        style={{ color: "rgba(240,244,240,0.32)" }}
      >
        {label}
      </span>
    </div>
  );
}

function HighlightRow({ player }: { player: HighlightPlayer }) {
  const color = POS_COLOR[player.position];
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-[family-name:var(--font-manrope)] text-[11px] font-extrabold"
        style={{
          background: `${color}1a`,
          color,
          border: `1.5px solid ${color}44`,
        }}
      >
        {player.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-[family-name:var(--font-manrope)] text-[12px] font-bold leading-none"
          style={{ color: "#f0f4f0" }}
        >
          {player.name}
        </p>
        <p className="mt-0.5 text-[10px] leading-none" style={{ color: "#5a7a5e" }}>
          {player.position}
        </p>
      </div>
      <div className="text-right">
        <span
          className="block font-[family-name:var(--font-manrope)] text-sm font-extrabold leading-none"
          style={{ color: "#f0b429" }}
        >
          {player.points}
        </span>
        <span
          className="mt-0.5 block text-[10px] leading-none"
          style={{ color: "#4ade80" }}
        >
          {player.delta}
        </span>
      </div>
    </div>
  );
}

function TransferRow({ transfer }: { transfer: Transfer }) {
  const color = POS_COLOR[transfer.position];
  const isIn = transfer.direction === "in";
  return (
    <div className="flex items-center gap-2.5">
      {/* mini jersey */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-[family-name:var(--font-manrope)] text-[10px] font-extrabold"
        style={{ background: "#0f1a14", border: `1.5px solid ${color}`, color }}
      >
        {transfer.initials}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-[family-name:var(--font-manrope)] text-[12px] font-bold leading-none"
          style={{ color: "#f0f4f0" }}
        >
          {transfer.name}
        </p>
        <p className="mt-0.5 text-[10px] leading-none" style={{ color: "#5a7a5e" }}>
          {isIn ? "Contratado" : "Vendido"}
        </p>
      </div>
      <span
        className="shrink-0 text-[11px] font-semibold"
        style={{ color: isIn ? "#4ade80" : "#f87171" }}
      >
        {isIn ? "↑" : "↓"} {transfer.value}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const totalPoints = FIELD_ROWS.flatMap((r) => r.players).reduce(
    (sum, p) => sum + p.points,
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* page heading */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Rodada 18</p>
          <h1 className="page-title mt-1">Meu Time</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(248,113,113,0.28)] bg-[rgba(248,113,113,0.1)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f87171]">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#f87171]"
            style={{ animation: "live-pulse 1.4s ease-in-out infinite", boxShadow: "0 0 6px #f87171" }}
          />
          Ao vivo
        </span>
      </div>

      {/* main 2-col grid */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_268px]">
        {/* ── left: stat cards + campo ── */}
        <div className="flex flex-col gap-5">
          {/* stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STAT_CARDS.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                sublabel={s.sublabel}
                tone={s.tone}
              />
            ))}
          </div>

          {/* campo */}
          <div
            style={{
              background: "#162419",
              border: "1px solid #2d4a33",
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* campo header */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid rgba(45,74,51,0.7)" }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "rgba(240,244,240,0.32)" }}
              >
                Escalação
              </p>
              <span
                className="font-[family-name:var(--font-manrope)] text-[13px] font-bold"
                style={{ color: "#f0b429" }}
              >
                {totalPoints} pts
              </span>
            </div>

            {/* linhas de posição */}
            {FIELD_ROWS.map((row, i) => (
              <div key={row.label}>
                <FieldRow label={row.label} players={row.players} />
                {i < FIELD_ROWS.length - 1 ? (
                  <div
                    style={{
                      height: 1,
                      background: "rgba(45,74,51,0.4)",
                      margin: "0 20px",
                    }}
                  />
                ) : null}
              </div>
            ))}

            {/* decoração central do campo */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 55% 25% at 50% 50%, rgba(74,222,128,0.025) 0%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* ── right: sidebar ── */}
        <div className="flex flex-col gap-3">
          {/* pontuação + histórico */}
          <SidebarCard>
            <div className="flex items-end gap-2">
              <span
                className="font-[family-name:var(--font-manrope)] font-extrabold leading-none"
                style={{
                  fontSize: 46,
                  color: "#f0b429",
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  textShadow: "0 0 24px rgba(240,180,41,0.35)",
                }}
              >
                127
              </span>
              <span
                className="mb-1 font-[family-name:var(--font-manrope)] text-lg font-bold leading-none"
                style={{ color: "rgba(240,180,41,0.45)" }}
              >
                pts
              </span>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: "rgba(240,244,240,0.32)" }}>
              892 pts total da temporada
            </p>
            <div className="mt-4">
              <MiniBarChart bars={ROUND_BARS} height={44} />
            </div>
          </SidebarCard>

          {/* elenco health */}
          <SidebarCard title="Elenco">
            <div className="grid grid-cols-2 gap-2">
              <HealthCard value={11} label="Titulares"  color="#4ade80" />
              <HealthCard value={3}  label="Reservas"   color="#60a5fa" />
              <HealthCard value={2}  label="Dúvidas"    color="#f0b429" />
              <HealthCard value={1}  label="Suspensos"  color="#f87171" />
            </div>
          </SidebarCard>

          {/* ranking */}
          <SidebarCard title="Ranking da Liga">
            <div
              style={{
                borderRadius: 7,
                overflow: "hidden",
                border: "1px solid rgba(45,74,51,0.7)",
              }}
            >
              <RankList entries={RANKING} currentId="me" />
            </div>
          </SidebarCard>

          {/* destaques */}
          <SidebarCard title="Destaques da Rodada">
            <div className="flex flex-col gap-3">
              {HIGHLIGHTS.map((h) => (
                <HighlightRow key={h.initials} player={h} />
              ))}
            </div>
          </SidebarCard>

          {/* transferências */}
          <SidebarCard title="Últimas Transferências">
            <div className="flex flex-col gap-3">
              {TRANSFERS.map((t) => (
                <TransferRow key={t.initials} transfer={t} />
              ))}
            </div>
          </SidebarCard>
        </div>
      </div>
    </div>
  );
}
