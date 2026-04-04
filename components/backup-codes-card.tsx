"use client";

import { useState } from "react";

type BackupCodesCardProps = {
  isTwoFactorEnabled: boolean;
  initialRemaining: number;
  initialGeneratedAt: string | null;
};

type BackupCodesState = {
  loading: boolean;
  remaining: number;
  generatedAt: string | null;
  revealedCodes: string[];
  error: string;
  success: string;
};

function formatGeneratedAt(value: string | null): string {
  if (!value) {
    return "Not generated yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "Generated recently";
  }

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function BackupCodesCard({
  isTwoFactorEnabled,
  initialRemaining,
  initialGeneratedAt
}: BackupCodesCardProps) {
  const [state, setState] = useState<BackupCodesState>({
    loading: false,
    remaining: initialRemaining,
    generatedAt: initialGeneratedAt,
    revealedCodes: [],
    error: "",
    success: ""
  });

  async function generateBackupCodes() {
    setState((current) => ({
      ...current,
      loading: true,
      error: "",
      success: "",
      revealedCodes: []
    }));

    const response = await fetch("/api/security/2fa/backup-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      backupCodes?: string[];
      twoFactor?: {
        backupCodesRemaining?: number;
        backupCodesGeneratedAt?: string | null;
      };
    };

    if (!response.ok || !payload.backupCodes || !payload.twoFactor) {
      setState((current) => ({
        ...current,
        loading: false,
        error: payload.error ?? "Could not generate backup codes.",
        success: ""
      }));
      return;
    }

    setState({
      loading: false,
      remaining: payload.twoFactor.backupCodesRemaining ?? payload.backupCodes.length,
      generatedAt: payload.twoFactor.backupCodesGeneratedAt ?? new Date().toISOString(),
      revealedCodes: payload.backupCodes,
      error: "",
      success: "Store these backup codes now. They are only shown once."
    });
  }

  if (!isTwoFactorEnabled) {
    return (
      <div className="backup-codes-card" data-testid="security-backup-codes-disabled">
        <p className="security-placeholder-copy">
          Enable an authenticator app first. Backup codes become available once 2FA is active.
        </p>
      </div>
    );
  }

  return (
    <div className="backup-codes-card" data-testid="security-backup-codes-card">
      <div className="backup-codes-summary">
        <div>
          <span className="settings-label">Recovery codes</span>
          <strong data-testid="security-backup-codes-remaining">{state.remaining} codes available</strong>
          <p className="auth-subtitle">
            Use a backup code if you lose access to your authenticator app. Regenerating replaces the current set.
          </p>
        </div>
        <span className="backup-codes-generated-at" data-testid="security-backup-codes-generated-at">
          {formatGeneratedAt(state.generatedAt)}
        </span>
      </div>

      <button
        type="button"
        className="dashboard-note-save"
        data-testid="security-backup-codes-generate"
        onClick={generateBackupCodes}
        disabled={state.loading}
      >
        {state.loading
          ? "Generating backup codes..."
          : state.remaining > 0
            ? "Regenerate backup codes"
            : "Generate backup codes"}
      </button>

      {state.revealedCodes.length > 0 ? (
        <div className="backup-codes-reveal" data-testid="security-backup-codes-reveal">
          <p className="settings-label">One-time view</p>
          <div className="backup-codes-grid">
            {state.revealedCodes.map((code, index) => (
              <code key={code} data-testid={`security-backup-code-${index + 1}`}>
                {code}
              </code>
            ))}
          </div>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="auth-error" data-testid="security-backup-codes-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="auth-success" data-testid="security-backup-codes-success">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}
