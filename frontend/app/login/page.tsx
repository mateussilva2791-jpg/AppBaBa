"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/ui/auth-shell";
import { apiRequest } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import type { League, TokenResponse } from "@/lib/types";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    let navigated = false;
    try {
      const response = await apiRequest<TokenResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      saveToken(response.access_token);

      const leagues = await apiRequest<League[]>("/leagues", {
        token: response.access_token,
      });

      navigated = true;
      router.push(leagues.length > 0 ? `/league/${leagues[0].slug}` : "/league/new");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nao foi possivel entrar.");
    } finally {
      // On success keep spinner alive until the page unmounts during navigation.
      // Only reset loading when an error occurred.
      if (!navigated) setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Login"
      title="Entre na sua central esportiva e assuma o controle da rodada."
      description="Acesso rapido ao workspace da liga, com leitura premium de sessao, ranking, sorteio e operacao ao vivo."
      ctaHref="/register"
      ctaLabel="Criar conta"
      secondaryHref="/"
      secondaryLabel="Conhecer produto"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="eyebrow">Acesso da liga</p>
          <h2 className="section-title">Entrar na plataforma</h2>
          <p className="muted-copy">Use seu e-mail para abrir o painel da sua liga e continuar a operacao.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-medium text-white">E-mail</label>
            <input
              id="login-email"
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
            <label htmlFor="login-password" className="text-sm font-medium text-white">Senha</label>
            <div className="relative">
              <input
                id="login-password"
                className="input-shell w-full pr-12"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[--color-text-muted] transition hover:text-white"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-primary w-full py-4 text-base"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Entrando...
              </span>
            ) : (
              "Entrar no painel"
            )}
          </button>
        </form>

        <div className="space-y-3 text-center text-sm text-[--color-text-400]">
          <p>
            Sem liga ainda?{" "}
            <Link href="/register" className="text-sky-300 hover:text-sky-200">
              Criar conta e abrir workspace
            </Link>
          </p>
          <p>
            <Link href="/password-reset" className="text-[--color-text-muted] hover:text-white">
              Esqueci minha senha
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
