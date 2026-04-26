type Tone = "positive" | "negative" | "neutral" | "gold";

const TONE: Record<Tone, { line: string; glow: string; sub: string }> = {
  positive: { line: "#4ade80", glow: "rgba(74,222,128,0.2)", sub: "#4ade80" },
  negative: { line: "#f87171", glow: "rgba(248,113,113,0.2)", sub: "#f87171" },
  neutral:  { line: "rgba(154,184,158,0.3)", glow: "transparent", sub: "rgba(240,244,240,0.32)" },
  gold:     { line: "#f0b429", glow: "rgba(240,180,41,0.2)", sub: "#f0b429" },
};

type StatCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: Tone;
  accentColor?: string;
};

export function StatCard({ label, value, sublabel, tone = "neutral", accentColor }: StatCardProps) {
  const { line, glow, sub } = TONE[tone];
  const lineColor = accentColor ?? line;
  const glowColor = accentColor ? `${accentColor}33` : glow;
  const subColor  = accentColor ?? sub;

  return (
    <div
      className="relative overflow-hidden rounded-[18px] border p-4 transition-all duration-200"
      style={{
        borderColor: `${lineColor}22`,
        background: `radial-gradient(ellipse 80% 60% at 0% 0%, ${glowColor} 0%, transparent 70%), rgba(154,184,158,0.025)`,
      }}
    >
      {/* top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[18px]"
        style={{ background: lineColor, opacity: 0.85 }}
      />

      <p className="metric-card-label mt-1">{label}</p>

      <strong
        className="metric-card-value"
        style={tone === "gold" ? { color: "#f0b429", textShadow: "0 0 20px rgba(240,180,41,0.25)" } : {}}
      >
        {value}
      </strong>

      {sublabel ? (
        <span className="metric-card-sub" style={{ color: subColor }}>
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}
