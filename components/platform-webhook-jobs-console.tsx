"use client";

import { useState } from "react";
import type { BillingWebhookDeadLetter, PlatformWebhookJobsSnapshot } from "@/lib/billing/store";

type RetryResponse = {
  eventId?: string;
  error?: string;
  snapshot?: PlatformWebhookJobsSnapshot;
};

type PlatformWebhookJobsConsoleProps = {
  initialSnapshot: PlatformWebhookJobsSnapshot;
};

function deadLetterStatusTone(status: BillingWebhookDeadLetter["status"]) {
  return status === "Retried" ? "is-good" : "is-pending";
}

function formatTimestamp(value: string | undefined) {
  if (!value) {
    return "Not retried yet";
  }

  return new Date(value).toLocaleString("en-GB");
}

export function PlatformWebhookJobsConsole({ initialSnapshot }: PlatformWebhookJobsConsoleProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [submittingId, setSubmittingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function retryDeadLetter(deadLetterId: string) {
    setSubmittingId(deadLetterId);
    setMessage("");
    setError("");

    const response = await fetch("/api/platform/webhooks/retry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ deadLetterId })
    });

    const payload = (await response.json().catch(() => null)) as RetryResponse | null;
    if (!response.ok || !payload?.snapshot || !payload?.eventId) {
      setSubmittingId("");
      setError(payload?.error ?? "Could not retry webhook delivery.");
      return;
    }

    setSnapshot(payload.snapshot);
    setSubmittingId("");
    setMessage(`Retried webhook ${payload.eventId}.`);
  }

  return (
    <section className="platform-webhook-card" data-testid="platform-webhooks-page">
      <div className="settings-header billing-ready-header">
        <div>
          <h1>Webhook jobs</h1>
          <p className="auth-subtitle">
            Inspect failed signed billing deliveries, review failure diagnostics, and retry them after the underlying
            issue is understood.
          </p>
        </div>
        <span className="security-status-badge is-neutral" data-testid="platform-webhook-pending-count">
          {snapshot.pendingDeadLetters.length} pending
        </span>
      </div>

      {message ? (
        <p role="status" className="auth-success" data-testid="platform-webhook-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="auth-error" data-testid="platform-webhook-error">
          {error}
        </p>
      ) : null}

      <section className="platform-webhook-section" data-testid="platform-webhook-dead-letter-section">
        <div className="platform-webhook-section-header">
          <div>
            <h2>Pending dead letters</h2>
            <p>These deliveries failed after signature verification and require operator review before retry.</p>
          </div>
        </div>

        {snapshot.pendingDeadLetters.length > 0 ? (
          <div className="platform-webhook-list" data-testid="platform-webhook-dead-letter-list">
            {snapshot.pendingDeadLetters.map((deadLetter) => (
              <article
                className="platform-webhook-row"
                key={deadLetter.deadLetterId}
                data-testid={`platform-dead-letter-${deadLetter.deadLetterId}`}
              >
                <div>
                  <span className="settings-label">{deadLetter.eventType}</span>
                  <strong>{deadLetter.summary}</strong>
                  <p>Event ID: {deadLetter.eventId}</p>
                  <p data-testid={`platform-dead-letter-reason-${deadLetter.deadLetterId}`}>
                    {deadLetter.failureReason}
                  </p>
                  <p>
                    Tenant: {deadLetter.tenantId} · Failed: {formatTimestamp(deadLetter.failedAt)}
                  </p>
                </div>
                <div className="platform-webhook-row-actions">
                  <span className={`security-status-badge ${deadLetterStatusTone(deadLetter.status)}`}>
                    {deadLetter.status}
                  </span>
                  <button
                    type="button"
                    className="billing-payment-button"
                    onClick={() => retryDeadLetter(deadLetter.deadLetterId)}
                    disabled={submittingId !== ""}
                    data-testid={`platform-dead-letter-retry-${deadLetter.deadLetterId}`}
                  >
                    {submittingId === deadLetter.deadLetterId ? "Retrying..." : "Retry delivery"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="billing-payment-empty" data-testid="platform-webhook-empty">
            <strong>No pending dead letters</strong>
            <p>Failed signed deliveries will appear here with retry diagnostics once they exist.</p>
          </div>
        )}
      </section>

      <section className="platform-webhook-section" data-testid="platform-webhook-retry-history-section">
        <div className="platform-webhook-section-header">
          <div>
            <h2>Recent retries</h2>
            <p>Successful retry operations are retained here for quick operator verification.</p>
          </div>
        </div>

        {snapshot.recentRetries.length > 0 ? (
          <div className="platform-webhook-list" data-testid="platform-webhook-retry-history-list">
            {snapshot.recentRetries.map((deadLetter) => (
              <article
                className="platform-webhook-row"
                key={`${deadLetter.deadLetterId}-retried`}
                data-testid={`platform-retried-dead-letter-${deadLetter.deadLetterId}`}
              >
                <div>
                  <span className="settings-label">{deadLetter.eventType}</span>
                  <strong>{deadLetter.summary}</strong>
                  <p>Event ID: {deadLetter.eventId}</p>
                  <p>
                    Tenant: {deadLetter.tenantId} · Retried: {formatTimestamp(deadLetter.lastRetriedAt)}
                  </p>
                </div>
                <div className="platform-webhook-row-actions">
                  <span className={`security-status-badge ${deadLetterStatusTone(deadLetter.status)}`}>
                    {deadLetter.status}
                  </span>
                  <span className="platform-webhook-retry-count">Retries: {deadLetter.retryCount}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="billing-payment-empty" data-testid="platform-webhook-retry-history-empty">
            <strong>No retries yet</strong>
            <p>Retried dead letters will move here after a platform operator replays them successfully.</p>
          </div>
        )}
      </section>
    </section>
  );
}
