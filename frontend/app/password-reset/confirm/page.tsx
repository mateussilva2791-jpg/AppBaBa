"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { FormEvent, Suspense, useState } from "react";

import { AuthShell } from "@/components/ui/auth-shell";
import { apiRequest } from "@/lib/api";


function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    if (newPassword.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/auth/password-reset/confirm", {
        method: "POST",
        body: { token, new_password: newPassword },
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-medium text-emerald-200">Senha redefinida!</p>
            <p className="mt-1 text-sm text-emerald-300/80">
              Sua senha foi atualizada com sucesso. Redirecionando para o login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {!tokenFromUrl ? (
        <div className="space-y-2">
          <label htmlFor="confirm-token" className="text-sm font-medium text-white">Código de redefinição</label>
          <input
            id="confirm-token"
            className="input-shell w-full font-mono text-sm"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Cole o código recebido por e-mail"
            required
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="new-password" className="text-sm font-medium text-white">Nova senha</label>
        <div className="relative">
          <input
            id="new-password"
            className="input-shell w-full pr-12"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres, 1 maiúscula e 1 número"
            autoComplete="new-password"
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

      <div className="space-y-2">
        <label htmlFor="confirm-password" className="text-sm font-medium text-white">Confirmar nova senha</label>
        <input
          id="confirm-password"
          className="input-shell w-full"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a nova senha"
          autoComplete="new-password"
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
        disabled={loading || !token}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Redefinindo...
          </span>
        ) : (
          "Salvar nova senha"
        )}
      </button>

      <p className="text-center text-sm text-[--color-text-400]">
        <Link href="/password-reset" className="text-sky-300 hover:text-sky-200">
          Solicitar novo link
        </Link>
        {" · "}
        <Link href="/login" className="text-[--color-text-muted] hover:text-white">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}

export default function PasswordResetConfirmPage() {
  return (
    <AuthShell
      eyebrow="Recuperação"
      title="Crie uma nova senha segura para sua conta."
      description="Use no mínimo 8 caracteres, uma letra maiúscula e um número."
      ctaHref="/login"
      ctaLabel="Voltar ao login"
      secondaryHref="/password-reset"
      secondaryLabel="Solicitar novo link"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="eyebrow">Nova senha</p>
          <h2 className="section-title">Criar nova senha</h2>
          <p className="muted-copy">O link que você recebeu por e-mail é válido por 30 minutos.</p>
        </div>

        <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-12 rounded-2xl bg-white/5" /><div className="h-12 rounded-2xl bg-white/5" /></div>}>
          <ConfirmForm />
        </Suspense>
      </div>
    </AuthShell>
  );
}
