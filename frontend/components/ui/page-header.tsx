import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";


export function PageHeader({
  eyebrow,
  title,
  description,
  stats,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  stats?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="page-header">
      <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-3">
          <Reveal variant="left">
            <p className="eyebrow">{eyebrow}</p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="page-title max-w-3xl">{title}</h1>
          </Reveal>
          {description ? (
            <Reveal delay={200}>
              <p className="muted-copy max-w-2xl">{description}</p>
            </Reveal>
          ) : null}
        </div>

        {(stats ?? actions) ? (
          <Reveal variant="right" delay={200} className="space-y-3 lg:text-right">
            {stats}
            {actions}
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
