import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ShieldCheck, Trophy } from "lucide-react";

export function AuthShell({
  eyebrow,
  title,
  description,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  children: ReactNode;
}) {
  const bullets = [
    { icon: Trophy, label: "Rodada, ranking e operacao ao vivo no mesmo fluxo." },
    { icon: ShieldCheck, label: "Workspace confiavel para ligas reais e recorrentes." },
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
      <div className="page-card flex flex-col justify-between gap-8">
        <div className="space-y-5">
          <p className="eyebrow">{eyebrow}</p>
          <div className="space-y-4">
            <h1 className="page-title max-w-2xl">{title}</h1>
            <p className="muted-copy max-w-xl">{description}</p>
          </div>
        </div>

        <div className="grid gap-3 md:max-w-xl">
          {bullets.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="surface-soft flex items-center gap-3 p-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-[--color-text-200]">{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={ctaHref} className="btn-primary">
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={secondaryHref} className="btn-secondary">
            {secondaryLabel}
          </Link>
        </div>
      </div>

      <div className="page-card">{children}</div>
    </section>
  );
}
