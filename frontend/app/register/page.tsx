"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/ui/auth-shell";
import { apiRequest } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import type { TokenResponse } from "@/lib/types";


export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<TokenResponse>("/auth/register", {
        method: "POST",
        body: {
          full_name: fullName,
          email,
          password,
        },
      });
      saveToken(response.access_token);
      router.push("/league/new");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Onboarding"
      title="Crie sua conta e inaugure uma liga com cara de startup esportiva."
      description="O onboarding abre um workspace premium para montar elenco, organizar rodada, operar jogos e transformar a experiencia da liga."
      ctaHref="/login"
      ctaLabel="Ja tenho acesso"
      secondaryHref="/"
      secondaryLabel="Voltar ao produto"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="eyebrow">Cadastro</p>
          <h2 className="section-title">Criar conta</h2>
          <p className="muted-copy">Comece com uma conta nova e siga direto para o onboarding da liga.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Nome completo</label>
            <input
              className="input-shell w-full"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              autoCapitalize="words"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">E-mail</label>
            <input
              className="input-shell w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@liga.com"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Senha</label>
            <div className="relative">
              <input
                className="input-shell w-full pr-11"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 caracteres, 1 maiúscula, 1 número"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-[--color-text-400] hover:text-white transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-[--color-text-400]">Mínimo 8 caracteres, pelo menos uma letra maiúscula e um número.</p>
          </div>
          {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Criando conta...
              </span>
            ) : (
              "Criar conta"
            )}
          </button>
        </form>

        <div className="text-sm text-[--color-text-400]">
          Ja tem conta? <Link href="/login" className="text-sky-300 hover:text-sky-200">Entrar na plataforma</Link>
        </div>
      </div>
    </AuthShell>
  );
}
