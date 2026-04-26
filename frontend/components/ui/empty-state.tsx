import type { ReactNode } from "react";


export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-card flex flex-col gap-4">
      <div className="space-y-2">
        <strong className="text-base text-[--color-text-primary]">{title}</strong>
        <p className="muted-copy">{description}</p>
      </div>
      {action}
    </div>
  );
}
