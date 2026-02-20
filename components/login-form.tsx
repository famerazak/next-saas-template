"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginState = {
  loading: boolean;
  error: string;
};

export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({ loading: false, error: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setState({ loading: true, error: "" });

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      redirectTo?: string;
    };

    if (!response.ok) {
      setState({
        loading: false,
        error: payload.error ?? "Unable to log in. Please try again."
      });
      return;
    }

    router.push(payload.redirectTo ?? "/dashboard");
    router.refresh();
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Log in</h1>
        <p className="auth-subtitle">Welcome back. Access your workspace.</p>
        <form className="auth-form" data-testid="auth-form" onSubmit={handleSubmit}>
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
          <button type="submit" disabled={state.loading}>
            {state.loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <nav className="auth-links" aria-label="Auth shortcuts">
          <Link href="/signup">Create account</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </nav>
      </section>
    </main>
  );
}
