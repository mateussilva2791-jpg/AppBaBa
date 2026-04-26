import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";


export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <Reveal className="space-y-2">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="section-title">{title}</h2>
        {description ? <p className="muted-copy">{description}</p> : null}
      </Reveal>
      {action ? (
        <Reveal variant="right">
          {action}
        </Reveal>
      ) : null}
    </div>
  );
}
