import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/status-badge";


type OperatorModeLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  status: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function OperatorModeLayout({ eyebrow, title, subtitle, status, actions, children }: OperatorModeLayoutProps) {
  return (
    <div className="space-y-6">
      <section className="page-header">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-4">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="page-title max-w-4xl">{title}</h1>
            <p className="muted-copy max-w-3xl">{subtitle}</p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-end">
              <StatusBadge tone="info">{status}</StatusBadge>
            </div>
            {actions}
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}
