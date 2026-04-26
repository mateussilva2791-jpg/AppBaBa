"use client";

import { useEffect, useRef } from "react";

export type BarData = {
  value: number;
  label: string;
};

type MiniBarChartProps = {
  bars: BarData[];
  maxValue?: number;
  height?: number;
};

function Bar({
  value,
  max,
  isLast,
  label,
  height,
}: {
  value: number;
  max: number;
  isLast: boolean;
  label: string;
  height: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    requestAnimationFrame(() => {
      el.style.height = `${pct}%`;
    });
  }, [value, max]);

  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      {/* bar track */}
      <div
        className="relative w-full overflow-hidden rounded-sm"
        style={{
          height,
          background: "rgba(154,184,158,0.08)",
        }}
      >
        <div
          ref={barRef}
          className="absolute bottom-0 left-0 right-0 rounded-sm"
          style={{
            height: "0%",
            background: isLast
              ? "linear-gradient(180deg,#f0b429,#d99e24)"
              : "rgba(154,184,158,0.3)",
            transition: "height 0.7s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: isLast ? "0 0 8px rgba(240,180,41,0.35)" : "none",
          }}
        />
      </div>

      {/* label */}
      <span
        className="w-full truncate text-center font-[family-name:var(--font-manrope)] leading-none"
        style={{ fontSize: 8, color: "rgba(240,244,240,0.32)" }}
      >
        {label}
      </span>
    </div>
  );
}

export function MiniBarChart({ bars, maxValue, height = 48 }: MiniBarChartProps) {
  const max = maxValue ?? Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="mini-bar-track" style={{ height: height + 14 }}>
      {bars.map((bar, i) => (
        <Bar
          key={`${bar.label}-${i}`}
          value={bar.value}
          max={max}
          isLast={i === bars.length - 1}
          label={bar.label}
          height={height}
        />
      ))}
    </div>
  );
}
