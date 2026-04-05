"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PlatformDashboardSnapshot, PlatformTenantRecord } from "@/lib/platform/dashboard";

type PlatformDashboardProps = {
  adminEmail: string;
  snapshot: PlatformDashboardSnapshot;
};

type PlatformStatusFilter = "all" | "attention" | "active-billing" | "trial";

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

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "No platform update yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function PlatformDashboard({ adminEmail, snapshot }: PlatformDashboardProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlatformStatusFilter>("all");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(snapshot.tenants[0]?.tenantId ?? null);

  const filteredTenants = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);

    return snapshot.tenants.filter((tenant) => {
      if (statusFilter !== "all") {
        const matchesStatus =
          (statusFilter === "attention" && tenant.status === "Attention") ||
          (statusFilter === "active-billing" && tenant.status === "Active billing") ||
          (statusFilter === "trial" && tenant.status === "Trial");

        if (!matchesStatus) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        tenant.tenantName,
        tenant.tenantId,
        tenant.ownerEmail,
        tenant.billing.currentPlanName,
        tenant.members.map((member) => member.email).join(" ")
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, snapshot.tenants, statusFilter]);

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

  return (
    <section className="auth-card platform-dashboard-card" data-testid="platform-home-page">
      <div data-testid="platform-dashboard-page">
      <div className="settings-header">
        <div>
          <span className="settings-label">Platform Admin</span>
          <h1>Platform operations</h1>
          <p className="auth-subtitle">
            Search tenant workspaces, monitor account health, and inspect members plus billing state without leaving
            the platform area.
          </p>
        </div>
        <span className="security-status-badge is-pending" data-testid="platform-dashboard-admin-badge">
          {adminEmail}
        </span>
      </div>

      <div className="platform-kpi-grid" data-testid="platform-kpi-grid">
        <article className="platform-kpi-card" data-testid="platform-kpi-tenants">
          <span className="settings-label">Tenants</span>
          <strong>{snapshot.tenantCount}</strong>
          <p>Total workspaces currently visible to platform operations.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-kpi-members">
          <span className="settings-label">Members</span>
          <strong>{snapshot.memberCount}</strong>
          <p>Combined active member count across all visible tenants.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-kpi-attention">
          <span className="settings-label">Attention</span>
          <strong>{snapshot.attentionCount}</strong>
          <p>Tenants with pending dead letters or reliability issues needing review.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-kpi-active-billing">
          <span className="settings-label">Active billing</span>
          <strong>{snapshot.activeBillingCount}</strong>
          <p>Tenants currently beyond starter trial with billing activity on record.</p>
        </article>
      </div>

      <div className="platform-quick-grid">
        <article className="platform-quick-item" data-testid="platform-home-card-webhooks">
          <div>
            <span className="settings-label">Reliability</span>
            <strong>Webhook jobs</strong>
            <p>Inspect dead letters, review retry history, and replay failed deliveries without leaving platform tools.</p>
          </div>
          <Link
            href="/platform/webhooks-jobs"
            className="audit-log-details-button"
            data-testid="platform-home-link-webhooks"
          >
            Open webhook jobs
          </Link>
        </article>
      </div>

      <div className="platform-toolbar" data-testid="platform-tenant-toolbar">
        <label htmlFor="platform-tenant-search">
          Search tenants
          <input
            id="platform-tenant-search"
            type="search"
            placeholder="Search by tenant, owner, or plan"
            value={query}
            data-testid="platform-tenant-search-input"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <label htmlFor="platform-tenant-status-filter">
          Status
          <select
            id="platform-tenant-status-filter"
            value={statusFilter}
            data-testid="platform-tenant-status-filter"
            onChange={(event) => setStatusFilter(event.currentTarget.value as PlatformStatusFilter)}
          >
            <option value="all">All tenants</option>
            <option value="attention">Attention</option>
            <option value="active-billing">Active billing</option>
            <option value="trial">Trial</option>
          </select>
        </label>
      </div>

      <div className="platform-results-summary" data-testid="platform-tenant-results-summary">
        Showing {filteredTenants.length} of {snapshot.tenants.length} tenants
      </div>

      <div className="platform-dashboard-layout">
        <div className="platform-tenant-list" data-testid="platform-tenant-list">
          {filteredTenants.length > 0 ? (
            filteredTenants.map((tenant) => (
              <article
                className={`platform-tenant-card${selectedTenantId === tenant.tenantId ? " is-selected" : ""}`}
                key={tenant.tenantId}
                data-testid={`platform-tenant-card-${tenant.tenantId}`}
              >
                <div className="platform-tenant-card-copy">
                  <div className="platform-tenant-card-heading">
                    <div>
                      <strong>{tenant.tenantName}</strong>
                      <p>{tenant.tenantId}</p>
                    </div>
                    <span
                      className={`security-status-badge ${
                        tenant.status === "Attention"
                          ? "is-pending"
                          : tenant.status === "Active billing"
                            ? "is-good"
                            : "is-neutral"
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </div>
                  <div className="platform-tenant-card-meta">
                    <span>{tenant.memberCount} members</span>
                    <span>{tenant.billing.currentPlanName}</span>
                    <span>{formatCurrency(tenant.billing.estimatedMonthlyTotal)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="audit-log-details-button"
                  onClick={() => setSelectedTenantId(tenant.tenantId)}
                  data-testid={`platform-tenant-open-${tenant.tenantId}`}
                >
                  Open detail
                </button>
              </article>
            ))
          ) : (
            <div className="team-empty-state" data-testid="platform-tenant-empty">
              No tenants matched the current search or status filter.
            </div>
          )}
        </div>

        <aside className="platform-tenant-detail" data-testid="platform-tenant-detail">
          {selectedTenant ? (
            <>
              <div className="platform-tenant-detail-header">
                <div>
                  <span className="settings-label">Tenant detail</span>
                  <h2 data-testid="platform-tenant-detail-name">{selectedTenant.tenantName}</h2>
                  <p className="auth-subtitle" data-testid="platform-tenant-detail-id">
                    {selectedTenant.tenantId}
                  </p>
                </div>
                <span className="security-status-badge is-pending">{selectedTenant.status}</span>
              </div>

              <div className="platform-tenant-detail-grid">
                <article className="platform-tenant-detail-card" data-testid="platform-tenant-detail-members-summary">
                  <span className="settings-label">Members</span>
                  <strong>{selectedTenant.memberCount}</strong>
                  <p>
                    Owner: {selectedTenant.ownerEmail || "Not available"} · Admin roles: {selectedTenant.adminCount}
                  </p>
                </article>
                <article className="platform-tenant-detail-card" data-testid="platform-tenant-detail-billing-summary">
                  <span className="settings-label">Billing snapshot</span>
                  <strong>{selectedTenant.billing.currentPlanName}</strong>
                  <p>
                    {formatCurrency(selectedTenant.billing.estimatedMonthlyTotal)} · {selectedTenant.billing.seatCount} seats
                  </p>
                </article>
              </div>

              <article className="platform-tenant-detail-card" data-testid="platform-tenant-detail-members">
                <div className="platform-tenant-detail-section-header">
                  <div>
                    <h3>Members</h3>
                    <p>Current tenant membership as visible to platform operations.</p>
                  </div>
                </div>
                <div className="platform-members-list">
                  {selectedTenant.members.map((member) => (
                    <div className="platform-member-row" key={member.id} data-testid={`platform-member-${member.id}`}>
                      <div>
                        <strong>{member.fullName || member.email}</strong>
                        <p>{member.email}</p>
                      </div>
                      <span className="team-badge team-badge-pending">{member.role}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="platform-tenant-detail-card" data-testid="platform-tenant-detail-billing">
                <div className="platform-tenant-detail-section-header">
                  <div>
                    <h3>Billing</h3>
                    <p>Plan, invoice, and delivery status for the selected tenant.</p>
                  </div>
                  <Link href="/platform/webhooks-jobs" className="audit-log-details-button" data-testid="platform-detail-open-webhooks">
                    Webhook jobs
                  </Link>
                </div>
                <div className="platform-billing-grid">
                  <div className="platform-billing-item">
                    <dt>Plan</dt>
                    <dd data-testid="platform-tenant-detail-plan">{selectedTenant.billing.currentPlanName}</dd>
                  </div>
                  <div className="platform-billing-item">
                    <dt>Invoice status</dt>
                    <dd data-testid="platform-tenant-detail-invoice-status">{selectedTenant.billing.latestInvoiceStatus}</dd>
                  </div>
                  <div className="platform-billing-item">
                    <dt>Pending dead letters</dt>
                    <dd data-testid="platform-tenant-detail-dead-letters">{selectedTenant.billing.pendingDeadLetters}</dd>
                  </div>
                  <div className="platform-billing-item">
                    <dt>Payment method</dt>
                    <dd data-testid="platform-tenant-detail-payment-method">
                      {selectedTenant.billing.paymentMethodSummary ?? "No card on file"}
                    </dd>
                  </div>
                  <div className="platform-billing-item">
                    <dt>Processed webhooks</dt>
                    <dd data-testid="platform-tenant-detail-processed-webhooks">{selectedTenant.billing.processedWebhookCount}</dd>
                  </div>
                  <div className="platform-billing-item">
                    <dt>Last updated</dt>
                    <dd data-testid="platform-tenant-detail-updated-at">{formatUpdatedAt(selectedTenant.updatedAt)}</dd>
                  </div>
                </div>
                {selectedTenant.dashboardNote ? (
                  <div className="platform-dashboard-note" data-testid="platform-tenant-detail-note">
                    <span className="settings-label">Tenant note</span>
                    <p>{selectedTenant.dashboardNote}</p>
                  </div>
                ) : null}
              </article>
            </>
          ) : (
            <div className="team-empty-state" data-testid="platform-tenant-detail-empty">
              Select a tenant to inspect members and billing state.
            </div>
          )}
        </aside>
      </div>
      </div>
    </section>
  );
}
