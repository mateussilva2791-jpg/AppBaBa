"use client";

import { PlusCircle, Ticket, Zap } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";


export function EmptyLeagueState() {
  return (
    <section className="state-panel mx-auto max-w-3xl">
      <Reveal variant="scale">
        <div className="state-icon bg-[rgba(0,230,118,0.12)] text-[--color-accent-primary]">
          <PlusCircle className="h-7 w-7" />
        </div>
      </Reveal>

      <Reveal delay={100} className="space-y-3 text-center">
        <p className="eyebrow">Nenhuma liga encontrada</p>
        <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
          Voce ainda nao participa de nenhuma liga.
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-[--color-text-secondary] sm:text-base">
          Crie sua primeira liga para comecar a organizar rodadas, sortear times e acompanhar partidas ao vivo.
        </p>
      </Reveal>

      <Reveal delay={200}>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/league/new" className="btn-primary min-w-44">
            <Zap className="h-4 w-4" />
            Criar liga
          </Link>
          <button type="button" className="btn-secondary min-w-44">
            <Ticket className="h-4 w-4" />
            Tenho um convite
          </button>
        </div>
      </Reveal>
    </section>
  );
}
