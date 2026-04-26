import type { ReactNode } from "react";

type FeedItemProps = {
  icon: ReactNode;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  timestamp: string;
  isLast?: boolean;
};

export function FeedItem({
  icon,
  iconColor = "#f0b429",
  iconBg,
  title,
  subtitle,
  timestamp,
  isLast = false,
}: FeedItemProps) {
  const resolvedBg = iconBg ?? `${iconColor}18`;

  return (
    <div
      className={`flex items-start gap-3 py-3 ${
        isLast ? "" : "feed-separator"
      }`}
    >
      {/* icon */}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm"
        style={{ color: iconColor, background: resolvedBg }}
      >
        {icon}
      </span>

      {/* content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-snug text-[--color-text-primary]">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[11px] leading-none text-[--color-text-muted]">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* timestamp */}
      <time className="shrink-0 text-[10px] font-medium leading-none text-[--color-text-muted]">
        {timestamp}
      </time>
    </div>
  );
}
