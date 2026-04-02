"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantRole } from "@/lib/tenant/context";

type TenantSettingsFormProps = {
  initialTenantName: string;
  tenantRole: TenantRole;
  tenantId: string;
};

type FormState = {
  tenantName: string;
  loading: boolean;
  error: string;
  success: string;
};

export function TenantSettingsForm({
  initialTenantName,
  tenantRole,
  tenantId
}: TenantSettingsFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    tenantName: initialTenantName,
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

    const response = await fetch("/api/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantName: state.tenantName })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      settings?: { tenantName?: string };
    };

    if (!response.ok) {
      setState((current) => ({
        ...current,
        loading: false,
        error: payload.error ?? "Could not update tenant settings.",
        success: ""
      }));
      return;
    }

    setState((current) => ({
      ...current,
      tenantName: payload.settings?.tenantName ?? current.tenantName,
      loading: false,
      error: "",
      success: "Tenant settings updated."
    }));
    router.refresh();
  }

  return (
    <main className="page-shell">
      <section className="auth-card settings-card" data-testid="tenant-settings-page">
        <div className="settings-header">
          <div>
            <h1>Tenant settings</h1>
            <p className="auth-subtitle">Update your workspace details for the whole tenant.</p>
          </div>
        </div>
        <div className="settings-summary">
          <div>
            <span className="settings-label">Current role</span>
            <strong data-testid="tenant-settings-role">{tenantRole}</strong>
          </div>
          <div>
            <span className="settings-label">Tenant ID</span>
            <strong data-testid="tenant-settings-id">{tenantId || "Session fallback"}</strong>
          </div>
        </div>
        <form className="auth-form" data-testid="tenant-settings-form" onSubmit={handleSubmit}>
          <label htmlFor="tenantName">
            Tenant name
            <input
              id="tenantName"
              name="tenantName"
              type="text"
              maxLength={80}
              placeholder="Acme Workspace"
              data-testid="tenant-name-input"
              value={state.tenantName}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  tenantName: event.target.value
                }))
              }
            />
          </label>
          {state.error ? (
            <p role="alert" className="auth-error" data-testid="tenant-settings-error">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p role="status" className="auth-success" data-testid="tenant-settings-success">
              {state.success}
            </p>
          ) : null}
          <button type="submit" disabled={state.loading}>
            {state.loading ? "Saving..." : "Save tenant settings"}
          </button>
        </form>
      </section>
    </main>
  );
}
