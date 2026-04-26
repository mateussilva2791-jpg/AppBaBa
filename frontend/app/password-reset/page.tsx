"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/ui/auth-shell";
import { apiRequest } from "@/lib/api";


export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiRequest("/auth/password-reset", {
        method: "POST",
        body: { email },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar redefinição.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Recuperação"
      title="Redefina sua senha e volte para a operação da liga."
      description="Enviaremos um link seguro para o seu e-mail. O link expira em 30 minutos."
      ctaHref="/login"
      ctaLabel="Voltar ao login"
      secondaryHref="/"
      secondaryLabel="Conhecer produto"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="eyebrow">Esqueceu a senha</p>
          <h2 className="section-title">Redefinir acesso</h2>
          <p className="muted-copy">Informe o e-mail cadastrado e enviaremos as instruções.</p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-medium text-emerald-200">Link enviado!</p>
                <p className="mt-1 text-sm text-emerald-300/80">
                  Se <strong>{email}</strong> estiver cadastrado, você receberá o e-mail em instantes. Verifique a caixa de spam também.
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-[--color-text-400]">
              Não recebeu?{" "}
              <button
                type="button"
                className="text-sky-300 hover:text-sky-200"
                onClick={() => { setSent(false); setEmail(""); }}
              >
                Tentar novamente
              </button>
            </p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label htmlFor="reset-email" className="text-sm font-medium text-white">E-mail cadastrado</label>
              <input
                id="reset-email"
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
                  Enviando...
                </span>
              ) : (
                "Enviar link de redefinição"
              )}
            </button>

            <p className="text-center text-sm text-[--color-text-400]">
              Lembrou a senha?{" "}
              <Link href="/login" className="text-sky-300 hover:text-sky-200">
                Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
