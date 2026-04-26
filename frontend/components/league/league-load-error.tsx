import { AlertCircle, RefreshCcw } from "lucide-react";


export function LeagueLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="state-panel mx-auto max-w-3xl">
      <div className="state-icon bg-[rgba(248,113,113,0.16)] text-[--color-accent-danger]">
        <AlertCircle className="h-7 w-7" />
      </div>
      <div className="space-y-3 text-center">
        <p className="eyebrow text-[--color-accent-danger]">Falha de carregamento</p>
        <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold tracking-[-0.04em] text-[--color-text-primary] sm:text-4xl">
          Nao foi possivel carregar a liga
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-[--color-text-secondary] sm:text-base">
          {message}
        </p>
      </div>
      <button type="button" className="btn-primary min-w-44" onClick={onRetry}>
        <RefreshCcw className="h-4 w-4" />
        Tentar de novo
      </button>
    </section>
  );
}
