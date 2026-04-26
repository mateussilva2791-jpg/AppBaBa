"use client";

import { ArrowRight, ShieldCheck, Trophy, Users, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { League } from "@/lib/types";


const onboardingSteps = [
  {
    step: "01",
    title: "Criar nova liga",
    description: "Abrir um workspace proprio com dashboard, rodada, ranking e operacao live.",
    icon: Waves,
    iconClass: "bg-emerald-400/12 text-emerald-200",
  },
  {
    step: "02",
    title: "Montar o elenco",
    description: "Cadastrar jogadores e preparar o sorteio com atributos esportivos consistentes.",
    icon: Users,
    iconClass: "bg-sky-400/12 text-sky-200",
  },
  {
    step: "03",
    title: "Operar ao vivo",
    description: "Rode o sorteio, abra os confrontos e registre cada evento em tempo real.",
    icon: Trophy,
    iconClass: "bg-amber-400/12 text-amber-200",
  },
];

export default function CreateLeaguePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) {
      setSlug(value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const league = await apiRequest<League>("/leagues", {
        method: "POST",
        token,
        body: { name, slug, description: description || null },
      });
      router.push(`/league/${league.slug}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel criar a liga.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <section className="page-header">
        <p className="eyebrow">Onboarding</p>
        <h1 className="page-title mt-3 max-w-3xl">
          Inaugure sua liga e comece com um workspace esportivo forte.
        </h1>
        <p className="muted-copy mt-4 max-w-2xl">
          Crie a liga, cadastre o elenco e entre numa central pronta para rodada, sorteio e live ops.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-[--color-text-muted]">
          <ShieldCheck className="h-4 w-4 text-[--color-accent-primary]" />
          <span>Multi-tenant • Permissoes granulares • Planos flexiveis</span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Steps */}
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="eyebrow">Como funciona</p>
            <h2 className="section-title">Tres passos para a liga no ar</h2>
          </div>
          <div className="space-y-4">
            {onboardingSteps.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.step} className="surface-soft flex items-start gap-5 p-5">
                  <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-[--color-text-muted]">{item.step}</span>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[--color-text-secondary]">{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="page-card">
          <div className="space-y-3">
            <p className="eyebrow">Criar liga</p>
            <h2 className="section-title">Abrir workspace</h2>
            <p className="muted-copy">Defina nome e slug. O resto da jornada acontece dentro do produto.</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Nome da liga</label>
              <input
                className="input-shell w-full"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Baba Prime da Quinta"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Slug</label>
              <input
                className="input-shell w-full font-mono text-[--color-accent-primary]"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="baba-prime-da-quinta"
                required
              />
              <p className="text-xs text-[--color-text-muted]">Identificador unico na URL. Apenas letras, numeros e hifens.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Descricao <span className="text-[--color-text-muted]">(opcional)</span></label>
              <input
                className="input-shell w-full"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Liga competitiva com rodada ao vivo e ranking"
              />
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>
            ) : null}

            <button type="submit" className="btn-primary w-full py-3.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Criando liga...
                </span>
              ) : (
                <>
                  Criar liga e entrar no workspace
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
