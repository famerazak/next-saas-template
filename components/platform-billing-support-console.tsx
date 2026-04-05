"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  PlatformBillingAdjustmentKind,
  PlatformBillingSupportSnapshot,
  PlatformBillingSupportTenantRecord,
  PlatformSupportActionKind
} from "@/lib/platform/billing-support";

type PlatformBillingSupportConsoleProps = {
  adminEmail: string;
  snapshot: PlatformBillingSupportSnapshot;
};

type AdjustmentResponse = {
  error?: string;
  snapshot?: PlatformBillingSupportSnapshot;
};

type SupportResponse = {
  error?: string;
  snapshot?: PlatformBillingSupportSnapshot;
};

const BILLING_ADJUSTMENT_KINDS: PlatformBillingAdjustmentKind[] = ["Service credit", "Invoice correction"];
const SUPPORT_ACTION_KINDS: PlatformSupportActionKind[] = ["Escalated", "Needs customer reply", "Resolved"];

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function supportTone(action: PlatformSupportActionKind) {
  return action === "Resolved" ? "is-good" : action === "Escalated" ? "is-pending" : "is-neutral";
}

export function PlatformBillingSupportConsole({ adminEmail, snapshot }: PlatformBillingSupportConsoleProps) {
  const [tenants, setTenants] = useState(snapshot.tenants);
  const [query, setQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(snapshot.tenants[0]?.tenantId ?? null);

  const [adjustmentKind, setAdjustmentKind] = useState<PlatformBillingAdjustmentKind>("Service credit");
  const [adjustmentAmount, setAdjustmentAmount] = useState("125");
  const [adjustmentTicketId, setAdjustmentTicketId] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const [adjustmentMessage, setAdjustmentMessage] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");

  const [supportAction, setSupportAction] = useState<PlatformSupportActionKind>("Escalated");
  const [supportTicketId, setSupportTicketId] = useState("");
  const [supportReason, setSupportReason] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportError, setSupportError] = useState("");

  const filteredTenants = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
      return tenants;
    }

    return tenants.filter((tenant) => {
      const haystack = [
        tenant.tenantName,
        tenant.tenantId,
        tenant.ownerEmail,
        tenant.billing.currentPlanName,
        tenant.latestBillingAdjustment?.ticketId ?? "",
        tenant.latestSupportAction?.ticketId ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, tenants]);

  useEffect(() => {
    if (filteredTenants.length === 0) {
      setSelectedTenantId(null);
      return;
    }

    const existing = filteredTenants.find((tenant) => tenant.tenantId === selectedTenantId);
    if (!existing) {
      setSelectedTenantId(filteredTenants[0]?.tenantId ?? null);
    }
  }, [filteredTenants, selectedTenantId]);

  const selectedTenant = filteredTenants.find((tenant) => tenant.tenantId === selectedTenantId) ?? null;

  useEffect(() => {
    setAdjustmentMessage("");
    setAdjustmentError("");
    setSupportMessage("");
    setSupportError("");
  }, [selectedTenantId]);

  async function submitBillingAdjustment() {
    const reason = adjustmentReason.trim();
    const ticketId = adjustmentTicketId.trim();
    const amount = Number(adjustmentAmount);

    if (!selectedTenant) {
      setAdjustmentMessage("");
      setAdjustmentError("Select a tenant before applying a billing adjustment.");
      return;
    }

    if (!ticketId) {
      setAdjustmentMessage("");
      setAdjustmentError("Enter a support ticket ID before applying a billing adjustment.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setAdjustmentMessage("");
      setAdjustmentError("Enter a positive billing adjustment amount.");
      return;
    }

    if (reason.length < 8 || reason.length > 240) {
      setAdjustmentMessage("");
      setAdjustmentError("Enter an operator reason between 8 and 240 characters.");
      return;
    }

    setAdjustmentSubmitting(true);
    setAdjustmentMessage("");
    setAdjustmentError("");

    const response = await fetch("/api/platform/billing-adjustment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenantId: selectedTenant.tenantId,
        ticketId,
        kind: adjustmentKind,
        amount,
        reason
      })
    });

    const payload = (await response.json().catch(() => null)) as AdjustmentResponse | null;
    if (!response.ok || !payload?.snapshot) {
      setAdjustmentSubmitting(false);
      setAdjustmentMessage("");
      setAdjustmentError(payload?.error ?? "Could not apply billing adjustment.");
      return;
    }

    setTenants(payload.snapshot.tenants);
    setAdjustmentSubmitting(false);
    setAdjustmentTicketId("");
    setAdjustmentReason("");
    setAdjustmentMessage(`Logged ${adjustmentKind} for ${selectedTenant.tenantName} on ticket ${ticketId}.`);
  }

  async function submitSupportAction() {
    const reason = supportReason.trim();
    const ticketId = supportTicketId.trim();

    if (!selectedTenant) {
      setSupportMessage("");
      setSupportError("Select a tenant before logging a support action.");
      return;
    }

    if (!ticketId) {
      setSupportMessage("");
      setSupportError("Enter a support ticket ID before saving a support action.");
      return;
    }

    if (reason.length < 8 || reason.length > 240) {
      setSupportMessage("");
      setSupportError("Enter an operator reason between 8 and 240 characters.");
      return;
    }

    setSupportSubmitting(true);
    setSupportMessage("");
    setSupportError("");

    const response = await fetch("/api/platform/support-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenantId: selectedTenant.tenantId,
        ticketId,
        action: supportAction,
        reason
      })
    });

    const payload = (await response.json().catch(() => null)) as SupportResponse | null;
    if (!response.ok || !payload?.snapshot) {
      setSupportSubmitting(false);
      setSupportMessage("");
      setSupportError(payload?.error ?? "Could not save support action.");
      return;
    }

    setTenants(payload.snapshot.tenants);
    setSupportSubmitting(false);
    setSupportTicketId("");
    setSupportReason("");
    setSupportMessage(`Logged ${supportAction} for ${selectedTenant.tenantName} on ticket ${ticketId}.`);
  }

  const totalBillingAdjustments = tenants.reduce((total, tenant) => total + tenant.billingAdjustments.length, 0);
  const totalSupportActions = tenants.reduce((total, tenant) => total + tenant.supportActions.length, 0);

  return (
    <section className="auth-card platform-billing-support-card" data-testid="platform-billing-support-page">
      <div className="settings-header">
        <div>
          <span className="settings-label">Platform Admin</span>
          <h1>Billing and support operations</h1>
          <p className="auth-subtitle">
            Apply manual billing adjustments, log support actions, and keep every privileged platform step tied to a
            ticket and operator reason.
          </p>
        </div>
        <span className="security-status-badge is-pending" data-testid="platform-billing-support-admin-badge">
          {adminEmail}
        </span>
      </div>

      <div className="platform-kpi-grid">
        <article className="platform-kpi-card" data-testid="platform-billing-support-tenant-count">
          <span className="settings-label">Tenants</span>
          <strong>{tenants.length}</strong>
          <p>Customer workspaces currently available for operator intervention.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-billing-adjustment-count">
          <span className="settings-label">Billing adjustments</span>
          <strong>{totalBillingAdjustments}</strong>
          <p>Manual credits and invoice corrections recorded in this starter environment.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-support-action-count">
          <span className="settings-label">Support actions</span>
          <strong>{totalSupportActions}</strong>
          <p>Operator notes, escalations, and resolution markers recorded for tenant support work.</p>
        </article>
      </div>

      <div className="platform-quick-grid">
        <article className="platform-quick-item">
          <div>
            <span className="settings-label">Back</span>
            <strong>Platform dashboard</strong>
            <p>Return to tenant KPIs, user directory access, and platform-wide operational summaries.</p>
          </div>
          <Link href="/platform" className="audit-log-details-button" data-testid="platform-billing-support-back-home">
            Open platform dashboard
          </Link>
        </article>
      </div>

      <div className="platform-toolbar" data-testid="platform-billing-support-toolbar">
        <label htmlFor="platform-billing-support-search">
          Search tenants
          <input
            id="platform-billing-support-search"
            type="search"
            placeholder="Search by tenant, owner, plan, or ticket"
            data-testid="platform-billing-support-search-input"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="platform-results-summary" data-testid="platform-billing-support-results-summary">
        Showing {filteredTenants.length} of {tenants.length} tenants
      </div>

      <div className="platform-dashboard-layout">
        <div className="platform-tenant-list" data-testid="platform-billing-support-tenant-list">
          {filteredTenants.length > 0 ? (
            filteredTenants.map((tenant) => (
              <article
                className={`platform-tenant-card${selectedTenantId === tenant.tenantId ? " is-selected" : ""}`}
                key={tenant.tenantId}
                data-testid={`platform-billing-support-tenant-card-${tenant.tenantId}`}
              >
                <div className="platform-tenant-card-copy">
                  <div className="platform-tenant-card-heading">
                    <div>
                      <strong>{tenant.tenantName}</strong>
                      <p>{tenant.tenantId}</p>
                    </div>
                    <span className="security-status-badge is-neutral">{tenant.billing.currentPlanName}</span>
                  </div>
                  <div className="platform-tenant-card-meta">
                    <span>{formatCurrency(tenant.billing.estimatedMonthlyTotal)}</span>
                    <span>{tenant.latestBillingAdjustment?.ticketId ?? "No billing ticket yet"}</span>
                    <span>{tenant.latestSupportAction?.ticketId ?? "No support ticket yet"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="audit-log-details-button"
                  onClick={() => setSelectedTenantId(tenant.tenantId)}
                  data-testid={`platform-billing-support-open-${tenant.tenantId}`}
                >
                  Open detail
                </button>
              </article>
            ))
          ) : (
            <div className="team-empty-state" data-testid="platform-billing-support-tenant-empty">
              No tenants matched the current search.
            </div>
          )}
        </div>

        <aside className="platform-tenant-detail" data-testid="platform-billing-support-detail">
          {selectedTenant ? (
            <>
              <div className="platform-tenant-detail-header">
                <div>
                  <span className="settings-label">Tenant detail</span>
                  <h2 data-testid="platform-billing-support-detail-name">{selectedTenant.tenantName}</h2>
                  <p className="auth-subtitle" data-testid="platform-billing-support-detail-id">
                    {selectedTenant.tenantId}
                  </p>
                </div>
                <span className="security-status-badge is-neutral" data-testid="platform-billing-support-detail-plan">
                  {selectedTenant.billing.currentPlanName}
                </span>
              </div>

              <div className="platform-tenant-detail-grid">
                <article className="platform-tenant-detail-card" data-testid="platform-billing-support-billing-summary">
                  <span className="settings-label">Billing snapshot</span>
                  <strong>{formatCurrency(selectedTenant.billing.estimatedMonthlyTotal)}</strong>
                  <p>
                    Invoice: {selectedTenant.billing.latestInvoiceStatus} · Payment method:{" "}
                    {selectedTenant.billing.paymentMethodSummary ?? "No card on file"}
                  </p>
                </article>
                <article className="platform-tenant-detail-card" data-testid="platform-billing-support-support-summary">
                  <span className="settings-label">Latest support state</span>
                  <strong>{selectedTenant.latestSupportAction?.action ?? "No support action yet"}</strong>
                  <p>
                    {selectedTenant.latestSupportAction
                      ? `${selectedTenant.latestSupportAction.ticketId} · ${formatTimestamp(selectedTenant.latestSupportAction.createdAt)}`
                      : "Log a support action to create a tenant-visible operator trail."}
                  </p>
                </article>
              </div>

              <article className="platform-tenant-detail-card" data-testid="platform-billing-adjustment-card">
                <div className="platform-tenant-detail-section-header">
                  <div>
                    <h3>Manual billing adjustment</h3>
                    <p>Capture one-off billing interventions like credits and invoice corrections with operator context.</p>
                  </div>
                </div>

                {adjustmentMessage ? (
                  <p role="status" className="auth-success" data-testid="platform-billing-adjustment-success">
                    {adjustmentMessage}
                  </p>
                ) : null}
                {adjustmentError ? (
                  <p role="alert" className="auth-error" data-testid="platform-billing-adjustment-error">
                    {adjustmentError}
                  </p>
                ) : null}

                <div className="platform-ops-form-grid">
                  <label htmlFor="platform-billing-adjustment-kind">
                    Adjustment type
                    <select
                      id="platform-billing-adjustment-kind"
                      value={adjustmentKind}
                      data-testid="platform-billing-adjustment-kind"
                      onChange={(event) => setAdjustmentKind(event.currentTarget.value as PlatformBillingAdjustmentKind)}
                    >
                      {BILLING_ADJUSTMENT_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="platform-billing-adjustment-amount">
                    Amount (GBP)
                    <input
                      id="platform-billing-adjustment-amount"
                      type="number"
                      min="1"
                      step="1"
                      value={adjustmentAmount}
                      data-testid="platform-billing-adjustment-amount"
                      onChange={(event) => setAdjustmentAmount(event.currentTarget.value)}
                    />
                  </label>
                  <label htmlFor="platform-billing-adjustment-ticket">
                    Ticket ID
                    <input
                      id="platform-billing-adjustment-ticket"
                      type="text"
                      placeholder="BILL-1042"
                      value={adjustmentTicketId}
                      data-testid="platform-billing-adjustment-ticket"
                      onChange={(event) => setAdjustmentTicketId(event.currentTarget.value)}
                    />
                  </label>
                </div>

                <label className="platform-role-reason-field" htmlFor="platform-billing-adjustment-reason">
                  Operator reason
                  <textarea
                    id="platform-billing-adjustment-reason"
                    className="platform-role-reason-input"
                    value={adjustmentReason}
                    maxLength={240}
                    placeholder="Explain why the adjustment is being logged"
                    data-testid="platform-billing-adjustment-reason"
                    onChange={(event) => setAdjustmentReason(event.currentTarget.value)}
                  />
                </label>

                <button
                  type="button"
                  className="billing-payment-button"
                  disabled={adjustmentSubmitting}
                  data-testid="platform-billing-adjustment-submit"
                  onClick={submitBillingAdjustment}
                >
                  {adjustmentSubmitting ? "Saving adjustment..." : "Log billing adjustment"}
                </button>

                {selectedTenant.billingAdjustments.length > 0 ? (
                  <div className="platform-ops-history-list" data-testid="platform-billing-adjustment-history">
                    {selectedTenant.billingAdjustments.map((entry) => (
                      <article className="platform-ops-history-row" key={entry.id}>
                        <div>
                          <strong>
                            {entry.kind} · {formatCurrency(entry.amount)}
                          </strong>
                          <p>
                            {entry.ticketId} · {formatTimestamp(entry.createdAt)}
                          </p>
                          <p>{entry.reason}</p>
                        </div>
                        <span className="security-status-badge is-neutral">{entry.actorEmail}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="billing-payment-empty" data-testid="platform-billing-adjustment-empty">
                    <strong>No manual billing adjustments</strong>
                    <p>Credits and invoice corrections will appear here after the first operator action.</p>
                  </div>
                )}
              </article>

              <article className="platform-tenant-detail-card" data-testid="platform-support-action-card">
                <div className="platform-tenant-detail-section-header">
                  <div>
                    <h3>Support action</h3>
                    <p>Track platform support interventions so tenant admins can later see why operator work happened.</p>
                  </div>
                </div>

                {supportMessage ? (
                  <p role="status" className="auth-success" data-testid="platform-support-action-success">
                    {supportMessage}
                  </p>
                ) : null}
                {supportError ? (
                  <p role="alert" className="auth-error" data-testid="platform-support-action-error">
                    {supportError}
                  </p>
                ) : null}

                <div className="platform-ops-form-grid">
                  <label htmlFor="platform-support-action-kind">
                    Support action
                    <select
                      id="platform-support-action-kind"
                      value={supportAction}
                      data-testid="platform-support-action-kind"
                      onChange={(event) => setSupportAction(event.currentTarget.value as PlatformSupportActionKind)}
                    >
                      {SUPPORT_ACTION_KINDS.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="platform-support-ticket">
                    Ticket ID
                    <input
                      id="platform-support-ticket"
                      type="text"
                      placeholder="SUP-2041"
                      value={supportTicketId}
                      data-testid="platform-support-ticket"
                      onChange={(event) => setSupportTicketId(event.currentTarget.value)}
                    />
                  </label>
                </div>

                <label className="platform-role-reason-field" htmlFor="platform-support-reason">
                  Operator reason
                  <textarea
                    id="platform-support-reason"
                    className="platform-role-reason-input"
                    value={supportReason}
                    maxLength={240}
                    placeholder="Explain the support context and next step"
                    data-testid="platform-support-reason"
                    onChange={(event) => setSupportReason(event.currentTarget.value)}
                  />
                </label>

                <button
                  type="button"
                  className="billing-payment-button"
                  disabled={supportSubmitting}
                  data-testid="platform-support-action-submit"
                  onClick={submitSupportAction}
                >
                  {supportSubmitting ? "Saving support action..." : "Log support action"}
                </button>

                {selectedTenant.supportActions.length > 0 ? (
                  <div className="platform-ops-history-list" data-testid="platform-support-action-history">
                    {selectedTenant.supportActions.map((entry) => (
                      <article className="platform-ops-history-row" key={entry.id}>
                        <div>
                          <strong>{entry.action}</strong>
                          <p>
                            {entry.ticketId} · {formatTimestamp(entry.createdAt)}
                          </p>
                          <p>{entry.reason}</p>
                        </div>
                        <span className={`security-status-badge ${supportTone(entry.action)}`}>{entry.actorEmail}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="billing-payment-empty" data-testid="platform-support-action-empty">
                    <strong>No support actions logged</strong>
                    <p>Escalations, follow-up notes, and resolutions will appear here after the first action.</p>
                  </div>
                )}
              </article>
            </>
          ) : (
            <div className="team-empty-state" data-testid="platform-billing-support-detail-empty">
              Select a tenant to inspect billing and support operations.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
