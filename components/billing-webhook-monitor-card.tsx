"use client";

import { useState } from "react";
import type { BillingSnapshot } from "@/lib/billing/store";

type DeliveryStatus = "Processed" | "Duplicate";
type SimulateResponse = {
  deliveryStatus?: DeliveryStatus;
  eventId?: string;
  error?: string;
  snapshot?: BillingSnapshot;
};

type BillingWebhookMonitorCardProps = {
  initialSnapshot: BillingSnapshot;
};

function toneClass(status: DeliveryStatus) {
  return status === "Duplicate" ? "is-neutral" : "is-good";
}

export function BillingWebhookMonitorCard({ initialSnapshot }: BillingWebhookMonitorCardProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [submitting, setSubmitting] = useState<null | "checkout.session.completed" | "invoice.paid" | "replay-last">(
    null
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendTestWebhook(eventType: "checkout.session.completed" | "invoice.paid" | "replay-last") {
    setSubmitting(eventType);
    setMessage("");
    setError("");

    const response = await fetch("/api/billing/webhooks/test-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ eventType })
    });

    const payload = (await response.json().catch(() => null)) as SimulateResponse | null;
    if (!response.ok || !payload?.snapshot || !payload.deliveryStatus) {
      setSubmitting(null);
      setError(payload?.error ?? "Could not deliver test webhook.");
      return;
    }

    setSnapshot(payload.snapshot);
    setSubmitting(null);
    setMessage(
      payload.deliveryStatus === "Duplicate"
        ? "Duplicate delivery ignored."
        : `Webhook processed: ${eventType}.`
    );
  }

  return (
    <section className="billing-webhook-card" data-testid="billing-webhook-monitor-card">
      <div className="settings-header billing-ready-header">
        <div>
          <h2>Webhook monitor</h2>
          <p className="auth-subtitle">
            Stripe deliveries are signature-verified and deduplicated here. The starter includes a local simulator so
            you can test the full flow before wiring a real Stripe endpoint.
          </p>
        </div>
        <span className="security-status-badge is-neutral">Signed endpoint ready</span>
      </div>

      <div className="billing-webhook-summary-grid">
        <article className="billing-summary-card">
          <span className="settings-label">Processed unique events</span>
          <strong data-testid="billing-webhook-processed-count">{snapshot.processedWebhookCount}</strong>
          <p>Successful webhook mutations applied to billing state.</p>
        </article>
        <article className="billing-summary-card">
          <span className="settings-label">Duplicate deliveries ignored</span>
          <strong data-testid="billing-webhook-duplicate-count">{snapshot.duplicateWebhookCount}</strong>
          <p>Repeated event IDs do not apply state twice.</p>
        </article>
        <article className="billing-summary-card">
          <span className="settings-label">Latest invoice sync</span>
          <strong data-testid="billing-webhook-invoice-status">{snapshot.latestInvoiceStatus}</strong>
          <p>Invoice sync state reflected by the last paid delivery.</p>
        </article>
      </div>

      <div className="billing-webhook-actions">
        <button
          type="button"
          className="billing-payment-button"
          onClick={() => sendTestWebhook("checkout.session.completed")}
          disabled={submitting !== null}
          data-testid="billing-webhook-checkout-button"
        >
          {submitting === "checkout.session.completed" ? "Sending..." : "Simulate checkout completed"}
        </button>
        <button
          type="button"
          className="billing-payment-button is-secondary"
          onClick={() => sendTestWebhook("invoice.paid")}
          disabled={submitting !== null}
          data-testid="billing-webhook-invoice-button"
        >
          {submitting === "invoice.paid" ? "Sending..." : "Simulate invoice paid"}
        </button>
        <button
          type="button"
          className="billing-payment-button is-ghost"
          onClick={() => sendTestWebhook("replay-last")}
          disabled={submitting !== null}
          data-testid="billing-webhook-replay-button"
        >
          {submitting === "replay-last" ? "Replaying..." : "Replay last delivery"}
        </button>
      </div>

      {message ? (
        <p role="status" className="auth-success" data-testid="billing-webhook-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="auth-error" data-testid="billing-webhook-error">
          {error}
        </p>
      ) : null}

      <div className="billing-webhook-activity-list" data-testid="billing-webhook-activity-list">
        {snapshot.webhookActivity.length > 0 ? (
          snapshot.webhookActivity.map((activity) => (
            <article
              className="billing-webhook-activity-row"
              key={`${activity.eventId}-${activity.deliveryStatus}-${activity.receivedAt}`}
              data-testid={`billing-webhook-event-${activity.eventId}`}
            >
              <div>
                <span className="settings-label">{activity.eventType}</span>
                <strong>{activity.summary}</strong>
                <p>{new Date(activity.receivedAt).toLocaleString("en-GB")}</p>
              </div>
              <span className={`security-status-badge ${toneClass(activity.deliveryStatus)}`}>
                {activity.deliveryStatus}
              </span>
            </article>
          ))
        ) : (
          <div className="billing-payment-empty" data-testid="billing-webhook-empty">
            <strong>No webhook deliveries yet</strong>
            <p>Send a test event or post a signed Stripe payload to the webhook route to populate this monitor.</p>
          </div>
        )}
      </div>
    </section>
  );
}
