export function PlayerAvatar({ name, accent = "sky" }: { name: string; accent?: "sky" | "mint" | "gold" | "red" }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");

  const accentMap = {
    sky: "from-sky-400/30 to-sky-500/10 text-sky-100",
    mint: "from-emerald-400/30 to-emerald-500/10 text-emerald-100",
    gold: "from-amber-400/30 to-amber-500/10 text-amber-100",
    red: "from-red-400/30 to-red-500/10 text-red-100",
  } as const;

  return (
    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accentMap[accent]} text-sm font-bold`}>
      {initials}
    </span>
  );
}
