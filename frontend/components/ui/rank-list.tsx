export type RankListEntry = {
  id: string;
  rank: number;
  name: string;
  subInfo?: string;
  score: number;
};

type RankListProps = {
  entries: RankListEntry[];
  currentId?: string;
};

const RANK_COLORS = [
  { num: "text-[#f0b429]", bg: "bg-[rgba(240,180,41,0.12)]" },
  { num: "text-[#7dd3fc]", bg: "bg-[rgba(125,211,252,0.1)]" },
  { num: "text-[#4ade80]", bg: "bg-[rgba(74,222,128,0.1)]" },
];

export function RankList({ entries, currentId }: RankListProps) {
  return (
    <div className="flex flex-col">
      {entries.map((entry, i) => {
        const isCurrent = entry.id === currentId;
        const colors = RANK_COLORS[i] ?? { num: "text-[rgba(240,244,240,0.4)]", bg: "bg-[rgba(154,184,158,0.05)]" };

        return (
          <div
            key={entry.id}
            className={`feed-separator flex items-center gap-3 px-3 py-2.5 transition-colors first:border-0 ${
              isCurrent
                ? "bg-[rgba(240,180,41,0.07)] ring-1 ring-inset ring-[rgba(240,180,41,0.18)]"
                : "hover:bg-[rgba(154,184,158,0.04)]"
            }`}
          >
            {/* rank number */}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${colors.num} ${colors.bg}`}
            >
              {entry.rank}
            </span>

            {/* name + sub */}
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-[13px] font-semibold leading-none ${
                  isCurrent ? "text-[#f0b429]" : "text-[--color-text-primary]"
                }`}
              >
                {entry.name}
              </p>
              {entry.subInfo ? (
                <p className="mt-0.5 truncate text-[11px] leading-none text-[--color-text-muted]">
                  {entry.subInfo}
                </p>
              ) : null}
            </div>

            {/* score */}
            <strong
              className={`shrink-0 font-[family-name:var(--font-manrope)] text-base font-extrabold tabular-nums leading-none ${
                isCurrent ? "text-[#f0b429]" : "text-[rgba(240,244,240,0.88)]"
              }`}
              style={isCurrent ? { textShadow: "0 0 12px rgba(240,180,41,0.45)" } : undefined}
            >
              {entry.score}
            </strong>
          </div>
        );
      })}
    </div>
  );
}
