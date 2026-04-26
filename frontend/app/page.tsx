"use client";

import {
  Activity,
  BarChart3,
  Crown,
  Flame,
  Globe,
  Shield,
  Shuffle,
  Timer,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Reveal } from "@/components/ui/reveal";


const TICKER_ITEMS = [
  { label: "Gols registrados", value: "12.400+" },
  { label: "Rodadas realizadas", value: "3.200+" },
  { label: "Jogadores ativos", value: "8.900+" },
  { label: "Ligas no ar", value: "470+" },
  { label: "Sorteios ao vivo", value: "1.100+" },
  { label: "Partidas encerradas", value: "28.000+" },
];

const BENTO_ITEMS = [
  {
    icon: Shuffle,
    title: "Sorteio inteligente",
    body: "Equilibrio automatico por atributos — times formados em segundos, sem discussao.",
    color: "text-emerald-300",
    bg: "bg-emerald-400/10",
    span: "md:col-span-2",
  },
  {
    icon: Activity,
    title: "Live ops",
    body: "Registre gols, assistencias e cartoes em tempo real com sincronizacao via WebSocket.",
    color: "text-sky-300",
    bg: "bg-sky-400/10",
    span: "",
  },
  {
    icon: BarChart3,
    title: "Ranking dinamico",
    body: "Ranking atualizado por pontuacao ponderada com historico completo de desempenho.",
    color: "text-amber-300",
    bg: "bg-amber-400/10",
    span: "",
  },
  {
    icon: Globe,
    title: "Painel publico",
    body: "Compartilhe o placar ao vivo para os jogadores acompanharem pelo celular.",
    color: "text-violet-300",
    bg: "bg-violet-400/10",
    span: "",
  },
  {
    icon: Shield,
    title: "Permissoes granulares",
    body: "Owner, Admin e Operadores com controle total sobre quem registra o que.",
    color: "text-rose-300",
    bg: "bg-rose-400/10",
    span: "md:col-span-2",
  },
  {
    icon: Crown,
    title: "Planos flexiveis",
    body: "Do free ao premium: escale recursos conforme a liga cresce.",
    color: "text-amber-300",
    bg: "bg-amber-400/10",
    span: "",
  },
];

const HOW_STEPS = [
  {
    n: "01",
    icon: Trophy,
    title: "Crie a liga",
    body: "Abra um workspace com dashboard, rodada, ranking e live ops em menos de 1 minuto.",
    color: "text-emerald-300",
    bg: "bg-emerald-400/10",
  },
  {
    n: "02",
    icon: Users,
    title: "Monte o elenco",
    body: "Cadastre jogadores com atributos esportivos e prepare o sorteio equilibrado.",
    color: "text-sky-300",
    bg: "bg-sky-400/10",
  },
  {
    n: "03",
    icon: Flame,
    title: "Opere ao vivo",
    body: "Rode o sorteio, abra os confrontos e registre cada evento em tempo real.",
    color: "text-amber-300",
    bg: "bg-amber-400/10",
  },
];

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(4px)`;
    el.style.transition = "transform 0.08s linear";
  }

  function handleMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) translateZ(0px)";
    el.style.transition = "transform 0.5s ease";
  }

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className={className}>
      {children}
    </div>
  );
}

function AnimatedGradientText({ children }: { children: React.ReactNode }) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    let frame: number;
    let t = 0;
    function tick() {
      t += 0.4;
      if (el) el.style.backgroundPosition = `${t % 300}% 50%`;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span ref={spanRef} className="animated-gradient-text" style={{ backgroundSize: "300% 300%" }}>
      {children}
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="relative space-y-24 pb-24">
      {/* ── HERO ── */}
      <section className="dot-grid relative overflow-hidden rounded-[32px] px-6 py-20 text-center md:px-12 md:py-28">
        <Reveal variant="scale">
          <span className="hero-badge mx-auto mb-6 inline-flex items-center gap-2">
            <Zap className="h-3.5 w-3.5" />
            Plataforma live para babas e ligas amateurs
          </span>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[1.05] tracking-[-0.04em] text-white md:text-7xl">
            Gerencie sua liga{" "}
            <AnimatedGradientText>como os profissionais</AnimatedGradientText>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="muted-copy mx-auto mt-6 max-w-2xl text-lg">
            Sorteio inteligente, live ops em tempo real e ranking automatico — tudo no celular, no campo, em segundos.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="btn-primary px-8 py-4 text-base">
              Comecar gratis
            </Link>
            <Link href="/login" className="btn-secondary px-8 py-4 text-base">
              Entrar na liga
            </Link>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-[--color-text-muted]">
            {[
              { icon: Timer, text: "Setup em 60 segundos" },
              { icon: Shield, text: "Multi-tenant seguro" },
              { icon: Globe, text: "Painel publico gratis" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[--color-accent-primary]" />
                {text}
              </span>
            ))}
          </div>
        </Reveal>

        {/* glow rings */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="glow-ring h-[480px] w-[480px] opacity-20" />
          <div className="glow-ring absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 opacity-30" />
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrapper overflow-hidden">
        <div className="ticker-track flex">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="ticker-item">
              <span className="ticker-dot" />
              <span className="font-bold text-white">{item.value}</span>
              <span className="text-[--color-text-muted]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BENTO GRID ── */}
      <section className="space-y-8">
        <Reveal>
          <div className="text-center">
            <p className="eyebrow">Recursos</p>
            <h2 className="section-title mt-2 text-3xl md:text-4xl">
              Tudo que sua liga precisa,{" "}
              <AnimatedGradientText>em um lugar</AnimatedGradientText>
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3">
          {BENTO_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={((i % 3) * 100) as 0 | 100 | 200 | 300}>
                <TiltCard className={`bento-card h-full p-6 ${item.span}`}>
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[--color-text-400]">{item.body}</p>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="space-y-12">
        <Reveal>
          <div className="text-center">
            <p className="eyebrow">Como funciona</p>
            <h2 className="section-title mt-2 text-3xl md:text-4xl">Tres passos para a liga no ar</h2>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {HOW_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.n} delay={((i * 100) as 0 | 100 | 200)}>
                <div className="step-card group relative overflow-hidden p-7">
                  <span className="step-number gradient-number absolute -right-4 -top-4 text-[7rem] font-black leading-none select-none">
                    {step.n}
                  </span>
                  <div className={`relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${step.bg} ${step.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="relative z-10 mt-5 text-xl font-bold text-white">{step.title}</h3>
                  <p className="relative z-10 mt-2 text-sm leading-6 text-[--color-text-400]">{step.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <Reveal variant="scale">
        <section className="aurora-card overflow-hidden rounded-[32px] p-10 text-center md:p-16">
          <p className="eyebrow">Comece agora</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
            Sua liga merece uma{" "}
            <AnimatedGradientText>estrutura profissional</AnimatedGradientText>
          </h2>
          <p className="muted-copy mx-auto mt-4 max-w-xl text-base">
            Gratis para comecar. Sem cartao de credito. Sua baba online em menos de 2 minutos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="btn-primary px-10 py-4 text-base">
              Criar conta gratis
            </Link>
            <Link href="/login" className="btn-secondary px-10 py-4 text-base">
              Ja tenho conta
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
