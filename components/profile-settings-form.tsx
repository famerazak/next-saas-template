"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProfileSettingsFormProps = {
  email: string;
  initialFullName: string;
  initialJobTitle: string;
};

type FormState = {
  fullName: string;
  jobTitle: string;
  loading: boolean;
  error: string;
  success: string;
};

export function ProfileSettingsForm({
  email,
  initialFullName,
  initialJobTitle
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    fullName: initialFullName,
    jobTitle: initialJobTitle,
    loading: false,
    error: "",
    success: ""
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({
      ...current,
      loading: true,
      error: "",
      success: ""
    }));

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: state.fullName,
        jobTitle: state.jobTitle
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      profile?: { fullName?: string; jobTitle?: string };
    };

    if (!response.ok) {
      setState((current) => ({
        ...current,
        loading: false,
        error: payload.error ?? "Could not update profile.",
        success: ""
      }));
      return;
    }

    setState((current) => ({
      ...current,
      fullName: payload.profile?.fullName ?? current.fullName,
      jobTitle: payload.profile?.jobTitle ?? current.jobTitle,
      loading: false,
      error: "",
      success: "Profile updated."
    }));
    router.refresh();
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Profile settings</h1>
        <p className="auth-subtitle">Manage your basic profile information.</p>
        <form className="auth-form" data-testid="profile-form" onSubmit={handleSubmit}>
          <label htmlFor="email">
            Email
            <input id="email" name="email" type="email" value={email} readOnly />
          </label>
          <label htmlFor="fullName">
            Full name
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Taylor Smith"
              maxLength={80}
              value={state.fullName}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  fullName: event.target.value
                }))
              }
            />
          </label>
          <label htmlFor="jobTitle">
            Job title
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              placeholder="Operations Manager"
              maxLength={80}
              value={state.jobTitle}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  jobTitle: event.target.value
                }))
              }
            />
          </label>
          {state.error ? (
            <p role="alert" className="auth-error" data-testid="profile-error">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p role="status" className="auth-success" data-testid="profile-success">
              {state.success}
            </p>
          ) : null}
          <button type="submit" disabled={state.loading}>
            {state.loading ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>
    </main>
  );
}
