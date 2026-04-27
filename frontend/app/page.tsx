"use client";

import {
  Activity,
  BarChart3,
  Check,
  Crown,
  Flame,
  Globe,
  Shield,
  Shuffle,
  Star,
  Timer,
  Trophy,
  Users,
  X,
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
    body: "Equilíbrio automático por atributos — times formados em segundos, sem discussão.",
    color: "text-emerald-300",
    bg: "bg-emerald-400/10",
    span: "md:col-span-2",
  },
  {
    icon: Activity,
    title: "Live ops",
    body: "Registre gols, assistências e cartões em tempo real com sincronização via WebSocket.",
    color: "text-sky-300",
    bg: "bg-sky-400/10",
    span: "",
  },
  {
    icon: BarChart3,
    title: "Ranking dinâmico",
    body: "Ranking atualizado por pontuação ponderada com histórico completo de desempenho.",
    color: "text-amber-300",
    bg: "bg-amber-400/10",
    span: "",
  },
  {
    icon: Globe,
    title: "Painel público",
    body: "Compartilhe o placar ao vivo para os jogadores acompanharem pelo celular.",
    color: "text-violet-300",
    bg: "bg-violet-400/10",
    span: "",
  },
  {
    icon: Shield,
    title: "Permissões granulares",
    body: "Owner, Admin e Operadores com controle total sobre quem registra o quê.",
    color: "text-rose-300",
    bg: "bg-rose-400/10",
    span: "md:col-span-2",
  },
  {
    icon: Crown,
    title: "Planos flexíveis",
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

const PLANS = [
  {
    name: "Gratuito",
    price: "0",
    period: "/mês",
    description: "Para começar e testar com sua galera.",
    cta: "Começar grátis",
    ctaHref: "/register",
    ctaStyle: "btn-secondary",
    popular: false,
    features: [
      { label: "1 liga", ok: true },
      { label: "Até 25 jogadores", ok: true },
      { label: "Painel público", ok: true },
      { label: "Live ops básico", ok: true },
      { label: "Histórico completo", ok: false },
      { label: "Ranking avançado", ok: false },
      { label: "Múltiplas ligas", ok: false },
    ],
  },
  {
    name: "Pro",
    price: "49",
    period: "/mês",
    description: "Para ligas sérias que querem controle total.",
    cta: "Assinar Pro",
    ctaHref: "/register",
    ctaStyle: "btn-primary",
    popular: true,
    features: [
      { label: "Ligas ilimitadas", ok: true },
      { label: "Jogadores ilimitados", ok: true },
      { label: "Painel público", ok: true },
      { label: "Live ops avançado", ok: true },
      { label: "Histórico completo", ok: true },
      { label: "Ranking avançado", ok: true },
      { label: "Permissões granulares", ok: true },
    ],
  },
];

const TESTIMONIALS = [
  {
    initials: "JM",
    name: "João Mendes",
    role: "Organizador — Liga Várzea FC",
    city: "São Paulo, SP",
    text: "Antes eu controlava tudo no WhatsApp e caderno. Agora o sorteio sai em segundos e todo mundo acompanha pelo celular. Mudou completamente.",
    color: "text-emerald-300",
    bg: "bg-emerald-400/10",
  },
  {
    initials: "RC",
    name: "Rafael Costa",
    role: "Admin — Baba das Quartas",
    city: "Belo Horizonte, MG",
    text: "O live ops é incrível. Registro o gol na hora, o placar atualiza para todo mundo. Nunca mais briguei por quem fez quantos gols.",
    color: "text-sky-300",
    bg: "bg-sky-400/10",
  },
  {
    initials: "LS",
    name: "Lucas Souza",
    role: "Organizador — Pelada dos Amigos",
    city: "Curitiba, PR",
    text: "Setup em menos de 2 minutos. Criei a liga, cadastrei os jogadores e já fiz o sorteio da primeira rodada no mesmo dia. Simples demais.",
    color: "text-amber-300",
    bg: "bg-amber-400/10",
  },
];

const FOOTER_LINKS = {
  Produto: [
    { label: "Recursos", href: "#recursos" },
    { label: "Preços", href: "#precos" },
    { label: "Como funciona", href: "#como-funciona" },
  ],
  Legal: [
    { label: "Termos de Uso", href: "/terms" },
    { label: "Privacidade", href: "/privacy" },
  ],
  Conta: [
    { label: "Criar conta", href: "/register" },
    { label: "Entrar", href: "/login" },
  ],
};

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

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function HomePage() {
  return (
    <div className="relative space-y-24 pb-0">
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
            Sorteio inteligente, live ops em tempo real e ranking automático — tudo no celular, no campo, em segundos.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="btn-primary px-8 py-4 text-base">
              Começar grátis
            </Link>
            <button
              type="button"
              className="btn-secondary px-8 py-4 text-base"
              onClick={() => scrollTo("como-funciona")}
            >
              Ver como funciona ↓
            </button>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-[--color-text-muted]">
            {[
              { icon: Timer, text: "Setup em 60 segundos" },
              { icon: Shield, text: "Multi-tenant seguro" },
              { icon: Globe, text: "Painel público grátis" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[--color-accent-primary]" />
                {text}
              </span>
            ))}
          </div>
        </Reveal>

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
      <section id="recursos" className="space-y-8">
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

      {/* ── TESTIMONIALS ── */}
      <section className="space-y-10">
        <Reveal>
          <div className="text-center">
            <p className="eyebrow">Depoimentos</p>
            <h2 className="section-title mt-2 text-3xl md:text-4xl">
              Quem já usa,{" "}
              <AnimatedGradientText>não volta atrás</AnimatedGradientText>
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={((i * 100) as 0 | 100 | 200)}>
              <div className="bento-card flex h-full flex-col gap-4 p-6">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-6 text-[--color-text-400]">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-[family-name:var(--font-manrope)] text-xs font-bold ${t.bg} ${t.color}`}>
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-[--color-text-muted]">{t.role} · {t.city}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="space-y-12">
        <Reveal>
          <div className="text-center">
            <p className="eyebrow">Como funciona</p>
            <h2 className="section-title mt-2 text-3xl md:text-4xl">Três passos para a liga no ar</h2>
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

      {/* ── PRICING ── */}
      <section id="precos" className="space-y-10">
        <Reveal>
          <div className="text-center">
            <p className="eyebrow">Preços</p>
            <h2 className="section-title mt-2 text-3xl md:text-4xl">
              Simples e transparente,{" "}
              <AnimatedGradientText>sem surpresas</AnimatedGradientText>
            </h2>
            <p className="muted-copy mx-auto mt-3 max-w-xl text-base">
              Comece grátis, evolua quando a liga crescer. Sem cartão de crédito para começar.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={((i * 150) as 0 | 100 | 200)}>
              <div
                className={`relative flex h-full flex-col rounded-[28px] p-7 ${
                  plan.popular
                    ? "border border-[--color-accent-primary]/30 bg-[--color-accent-primary]/5 ring-1 ring-[--color-accent-primary]/20"
                    : "bento-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[--color-accent-primary] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0a1210]">
                      <Zap className="h-3 w-3" />
                      Mais popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[--color-text-muted]">{plan.name}</p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="font-[family-name:var(--font-manrope)] text-5xl font-extrabold leading-none tracking-[-0.05em] text-white">
                      R$ {plan.price}
                    </span>
                    <span className="mb-1 text-sm text-[--color-text-muted]">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-[--color-text-400]">{plan.description}</p>
                </div>

                <ul className="mb-7 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-3 text-sm">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${f.ok ? "bg-emerald-400/15 text-emerald-300" : "bg-white/6 text-[--color-text-muted]"}`}>
                        {f.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </span>
                      <span className={f.ok ? "text-[--color-text-primary]" : "text-[--color-text-muted]"}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.ctaHref} className={`${plan.ctaStyle} w-full text-center`}>
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
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
            Grátis para começar. Sem cartão de crédito. Sua baba online em menos de 2 minutos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="btn-primary px-10 py-4 text-base">
              Criar conta grátis
            </Link>
            <Link href="/login" className="btn-secondary px-10 py-4 text-base">
              Já tenho conta
            </Link>
          </div>
        </section>
      </Reveal>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/6 pt-12 pb-8">
        <div className="grid gap-10 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] font-[family-name:var(--font-manrope)] text-[14px] font-extrabold text-[#0a1210]"
                style={{ background: "linear-gradient(135deg,#4ade80,#f0b429)" }}
              >
                B
              </span>
              <strong className="font-[family-name:var(--font-manrope)] text-[15px] tracking-[-0.03em] text-white">
                App do Baba
              </strong>
            </div>
            <p className="max-w-[220px] text-xs leading-5 text-[--color-text-muted]">
              Sports SaaS para ligas amadoras. Sorteio, live ops e ranking no celular.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[--color-text-muted]">{group}</p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[--color-text-secondary] transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/6 pt-6 sm:flex-row">
          <p className="text-xs text-[--color-text-muted]">© 2025 App do Baba. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-xs text-[--color-text-muted]">
            <Link href="/terms" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
