"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type LoginStep = "password" | "two-factor";

type LoginFormProps = {
  initialStep?: LoginStep;
  challengedEmail?: string;
  twoFactorError?: string;
};

type LoginState = {
  loading: boolean;
  error: string;
  step: LoginStep;
  challengedEmail: string;
};

export function LoginForm({
  initialStep = "password",
  challengedEmail = "",
  twoFactorError = ""
}: LoginFormProps) {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({
    loading: false,
    error: "",
    step: initialStep,
    challengedEmail
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setState((current) => ({ ...current, loading: true, error: "" }));

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      redirectTo?: string;
      requiresTwoFactor?: boolean;
      email?: string;
    };

    if (!response.ok) {
      setState((current) => ({
        ...current,
        loading: false,
        error: payload.error ?? "Unable to log in. Please try again."
      }));
      return;
    }

    if (payload.requiresTwoFactor) {
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        step: "two-factor",
        challengedEmail: payload.email ?? email
      }));
      router.push(payload.redirectTo ?? "/login");
      router.refresh();
      return;
    }

    window.location.assign(payload.redirectTo ?? "/dashboard");
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>{state.step === "two-factor" ? "Two-factor check" : "Log in"}</h1>
        <p className="auth-subtitle">
          {state.step === "two-factor"
            ? `Password accepted for ${state.challengedEmail || "your account"}. Enter the latest 6-digit code from your authenticator app.`
            : "Welcome back. Access your workspace."}
        </p>

        {state.step === "password" ? (
          <form className="auth-form" data-testid="auth-form" onSubmit={handlePasswordSubmit}>
            <label htmlFor="email">
              Email
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
              />
            </label>
            <label htmlFor="password">
              Password
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </label>
            {state.error ? (
              <p role="alert" className="auth-error" data-testid="login-error">
                {state.error}
              </p>
            ) : null}
            <button type="submit" disabled={!hydrated || state.loading}>
              {state.loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        ) : (
          <form className="auth-form" data-testid="two-factor-form" action="/api/auth/login/verify-2fa" method="post">
            <label htmlFor="verificationCode">
              Authenticator code
              <input
                id="verificationCode"
                name="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                data-testid="login-2fa-code-input"
                required
              />
            </label>
            {twoFactorError ? (
              <p role="alert" className="auth-error" data-testid="login-2fa-error">
                {twoFactorError}
              </p>
            ) : null}
            <button type="submit">Verify and continue</button>
            <button
              type="submit"
              className="auth-secondary-button"
              data-testid="login-2fa-cancel"
              formAction="/api/auth/login/cancel-2fa"
            >
              Back to login
            </button>
          </form>
        )}

        <nav className="auth-links" aria-label="Auth shortcuts">
          <Link href="/signup">Create account</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </nav>
      </section>
    </main>
  );
}
