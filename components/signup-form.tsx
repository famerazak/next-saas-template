"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SignupState = {
  loading: boolean;
  error: string;
};

export function SignupForm() {
  const router = useRouter();
  const [state, setState] = useState<SignupState>({ loading: false, error: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setState({ loading: true, error: "" });

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      redirectTo?: string;
      tenantId?: string;
      tenantName?: string;
      role?: string;
    };

    if (!response.ok) {
      setState({
        loading: false,
        error: payload.error ?? "Unable to create account. Please try again."
      });
      return;
    }

    const redirectTo = payload.redirectTo ?? "/dashboard";
    const params = new URLSearchParams();
    if (payload.tenantId) params.set("tenantId", payload.tenantId);
    if (payload.tenantName) params.set("tenantName", payload.tenantName);
    if (payload.role) params.set("role", payload.role);
    const suffix = params.toString();
    router.push(suffix ? `${redirectTo}?${suffix}` : redirectTo);
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">Start your team workspace.</p>
        <form className="auth-form" data-testid="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">
            Work email
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
              autoComplete="new-password"
              placeholder="Create a password"
              minLength={8}
              required
            />
          </label>
          {state.error ? (
            <p role="alert" className="auth-error" data-testid="signup-error">
              {state.error}
            </p>
          ) : null}
          <button type="submit" disabled={state.loading}>
            {state.loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <nav className="auth-links" aria-label="Auth shortcuts">
          <Link href="/login">Already have an account?</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </nav>
      </section>
    </main>
  );
}
