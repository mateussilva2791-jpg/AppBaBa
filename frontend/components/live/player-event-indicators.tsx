"use client";


export function PlayerEventIndicators({
  goals,
  assists,
  yellowCards,
  redCards,
}: {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}) {
  const items = [
    {
      key: "goals",
      label: "Gols",
      value: goals,
      tone: "text-emerald-100",
      icon: "⚽",
      hideWhenZero: false,
    },
    {
      key: "assists",
      label: "Assistencias",
      value: assists,
      tone: "text-sky-100",
      icon: "👟",
      hideWhenZero: false,
    },
    {
      key: "yellow",
      label: "Amarelos",
      value: yellowCards,
      tone: "text-amber-100",
      icon: "🟨",
      hideWhenZero: true,
    },
    {
      key: "red",
      label: "Vermelhos",
      value: redCards,
      tone: "text-rose-100",
      icon: "🟥",
      hideWhenZero: true,
    },
  ];

  return (
    <div className="mt-1 flex min-h-5 flex-wrap items-center justify-center gap-1.5">
      {items.filter((item) => !item.hideWhenZero || item.value > 0).map((item) => (
        <span
          key={item.key}
          title={`${item.label}: ${item.value}`}
          className={`inline-flex items-center gap-1 text-[10px] font-semibold ${item.tone}`}
        >
          <span>{item.icon}</span>
          <span>{item.value}</span>
        </span>
      ))}
    </div>
  );
}
