"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlatformDiagnosticsSnapshot } from "@/lib/platform/diagnostics";
import type { PlatformAppErrorRecord } from "@/lib/platform/errors";

type PlatformDiagnosticsConsoleProps = {
  adminEmail: string;
  snapshot: PlatformDiagnosticsSnapshot;
};

type TestErrorResponse = {
  error?: string;
  errorRecord?: PlatformAppErrorRecord;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function PlatformDiagnosticsConsole({ adminEmail, snapshot }: PlatformDiagnosticsConsoleProps) {
  const [errors, setErrors] = useState(snapshot.errors);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function createTestError() {
    setCreating(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/platform/diagnostics/test-error", {
      method: "POST"
    });

    const payload = (await response.json().catch(() => null)) as TestErrorResponse | null;
    setCreating(false);

    if (!response.ok || !payload?.errorRecord) {
      setError(payload?.error ?? "Could not create a diagnostics test error.");
      return;
    }

    const errorRecord = payload.errorRecord;
    setErrors((current) => {
      const next = [errorRecord, ...current.filter((entry) => entry.fingerprint !== errorRecord.fingerprint)];
      return next.slice(0, 20);
    });
    setMessage("Diagnostics test error recorded.");
  }

  const repeatedErrorCount = errors.filter((entry) => entry.occurrenceCount > 1).length;

  return (
    <section className="auth-card platform-diagnostics-card" data-testid="platform-diagnostics-page">
      <div className="settings-header">
        <div>
          <span className="settings-label">Platform Admin</span>
          <h1>Diagnostics</h1>
          <p className="auth-subtitle">
            Review recent starter errors and verify the security-header baseline without leaving the platform area.
          </p>
        </div>
        <span className="security-status-badge is-pending" data-testid="platform-diagnostics-admin-badge">
          {adminEmail}
        </span>
      </div>

      <div className="platform-kpi-grid">
        <article className="platform-kpi-card" data-testid="platform-diagnostics-error-count">
          <span className="settings-label">Tracked errors</span>
          <strong>{errors.length}</strong>
          <p>Newest app-level errors captured for operator review.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-diagnostics-repeated-count">
          <span className="settings-label">Repeated</span>
          <strong>{repeatedErrorCount}</strong>
          <p>Errors seen more than once and worth triaging first.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-diagnostics-config-issues-count">
          <span className="settings-label">Config issues</span>
          <strong>{snapshot.configIssueCount}</strong>
          <p>Missing or fallback environment settings that still need operator attention.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-diagnostics-csp-count">
          <span className="settings-label">CSP covered</span>
          <strong>{snapshot.cspProtectedSurfaceCount}</strong>
          <p>Configured route surfaces currently protected by a Content-Security-Policy.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-diagnostics-surface-count">
          <span className="settings-label">Header surfaces</span>
          <strong>{snapshot.headerDiagnostics.length}</strong>
          <p>Route classes with verified header profiles available for operator review.</p>
        </article>
      </div>

      <div className="platform-quick-grid">
        <article className="platform-quick-item" data-testid="platform-diagnostics-back-card">
          <div>
            <span className="settings-label">Back</span>
            <strong>Platform dashboard</strong>
            <p>Return to the main ops surface and jump back into tenants, compliance, or support tooling.</p>
          </div>
          <Link href="/platform" className="audit-log-details-button" data-testid="platform-diagnostics-back-home">
            Open platform dashboard
          </Link>
        </article>
      </div>

      <div className="platform-diagnostics-layout">
        <section className="platform-tenant-detail-card" data-testid="platform-diagnostics-error-feed">
          <div className="platform-tenant-detail-section-header">
            <div>
              <h2>Recent app errors</h2>
              <p>Application-level failures captured for operators, including repeated error counts and source context.</p>
            </div>
            <button
              type="button"
              className="button-secondary"
              data-testid="platform-diagnostics-generate-error"
              disabled={creating}
              onClick={createTestError}
            >
              {creating ? "Recording…" : "Create test error"}
            </button>
          </div>

          {message ? (
            <p role="status" className="auth-success" data-testid="platform-diagnostics-success">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="auth-error" data-testid="platform-diagnostics-error">
              {error}
            </p>
          ) : null}

          {errors.length > 0 ? (
            <div className="platform-compliance-list" data-testid="platform-diagnostics-error-list">
              {errors.map((entry) => (
                <article className="platform-compliance-row" key={entry.id} data-testid={`platform-diagnostics-error-${entry.id}`}>
                  <div>
                    <div className="platform-compliance-row-heading">
                      <strong>{entry.message}</strong>
                      <span className={`security-status-badge ${entry.occurrenceCount > 1 ? "is-pending" : "is-neutral"}`}>
                        {entry.occurrenceCount > 1 ? `${entry.occurrenceCount}x` : entry.severity}
                      </span>
                    </div>
                    <p>{entry.source} · {entry.route}</p>
                    <p>Last seen {formatTimestamp(entry.lastSeenAt)}</p>
                    {typeof entry.metadata.triggeredBy === "string" ? <p>Triggered by: {entry.metadata.triggeredBy}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="team-empty-state" data-testid="platform-diagnostics-error-empty">
              No app errors are recorded yet.
            </div>
          )}
        </section>

        <section className="platform-tenant-detail-card" data-testid="platform-diagnostics-headers-feed">
          <div className="platform-tenant-detail-section-header">
            <div>
              <h2>Security headers</h2>
              <p>Configured header and CSP profiles for browser pages and API endpoints.</p>
            </div>
          </div>

          <div className="platform-compliance-list" data-testid="platform-diagnostics-header-list">
            {snapshot.headerDiagnostics.map((profile) => (
              <article
                className="platform-compliance-row"
                key={profile.id}
                data-testid={`platform-diagnostics-header-profile-${profile.id}`}
              >
                <div>
                  <div className="platform-compliance-row-heading">
                    <strong>{profile.label}</strong>
                    <span className={`security-status-badge ${profile.status === "Healthy" ? "is-good" : "is-pending"}`}>
                      {profile.status}
                    </span>
                  </div>
                  <p>{profile.summary}</p>
                  <p>
                    Sample path: <code>{profile.samplePath}</code> · Matcher: <code>{profile.matcher}</code>
                  </p>
                  <p>
                    CSP: {profile.cspStatus} · Headers configured: {profile.headerCount}
                  </p>
                  <ul className="platform-diagnostics-header-values">
                    {profile.headers.map((header) => (
                      <li key={`${profile.id}-${header.key}`}>
                        <strong>{header.key}</strong>
                        <code>{header.value}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="platform-tenant-detail-card" data-testid="platform-diagnostics-config-feed">
        <div className="platform-tenant-detail-section-header">
          <div>
            <h2>Environment and config health</h2>
            <p>
              Operator-facing startup and integration checks for auth, storage, analytics, and webhook configuration.
            </p>
          </div>
          <span className="security-status-badge is-neutral" data-testid="platform-diagnostics-config-summary">
            {snapshot.configIssueCount} issues · {snapshot.configStarterModeCount} starter-mode checks
          </span>
        </div>

        <div className="platform-compliance-list" data-testid="platform-diagnostics-config-list">
          {snapshot.configDiagnostics.map((check) => (
            <article
              className="platform-compliance-row"
              key={check.id}
              data-testid={`platform-diagnostics-config-${check.id}`}
            >
              <div>
                <div className="platform-compliance-row-heading">
                  <strong>{check.label}</strong>
                  <span
                    className={`security-status-badge ${
                      check.status === "Healthy"
                        ? "is-good"
                        : check.status === "Starter mode"
                          ? "is-neutral"
                          : "is-pending"
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                <p>{check.summary}</p>
                <p>{check.operatorAction}</p>
                <p>Env vars: {check.envVars.join(", ")}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
