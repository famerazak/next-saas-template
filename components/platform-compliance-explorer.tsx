"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlatformWebhookJobsConsole } from "@/components/platform-webhook-jobs-console";
import type { PlatformComplianceSnapshot } from "@/lib/platform/compliance";

type PlatformComplianceExplorerProps = {
  adminEmail: string;
  snapshot: PlatformComplianceSnapshot;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function PlatformComplianceExplorer({ adminEmail, snapshot }: PlatformComplianceExplorerProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeQuery(query);

  const filteredAuditEvents = useMemo(() => {
    if (!normalizedQuery) {
      return snapshot.auditEvents;
    }

    return snapshot.auditEvents.filter((event) =>
      [
        event.tenantName,
        event.summary,
        event.action,
        event.actorEmail,
        event.actorRole,
        event.targetLabel ?? "",
        typeof event.metadata.reason === "string" ? event.metadata.reason : ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [normalizedQuery, snapshot.auditEvents]);

  const filteredSecuritySignals = useMemo(() => {
    if (!normalizedQuery) {
      return snapshot.securitySignals;
    }

    return snapshot.securitySignals.filter((signal) =>
      [signal.email, signal.fullName, signal.summary, signal.tenantNames.join(" "), signal.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [normalizedQuery, snapshot.securitySignals]);

  return (
    <section className="auth-card platform-compliance-card" data-testid="platform-compliance-page">
      <div className="settings-header">
        <div>
          <span className="settings-label">Platform Admin</span>
          <h1>Compliance explorer</h1>
          <p className="auth-subtitle">
            Review global audit activity, spot security posture gaps, and handle failed webhook work from one platform surface.
          </p>
        </div>
        <span className="security-status-badge is-pending" data-testid="platform-compliance-admin-badge">
          {adminEmail}
        </span>
      </div>

      <div className="platform-kpi-grid">
        <article className="platform-kpi-card" data-testid="platform-compliance-audit-count">
          <span className="settings-label">Audit events</span>
          <strong>{snapshot.auditEventCount}</strong>
          <p>Recent tenant and platform-origin audit events visible to compliance operations.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-compliance-security-count">
          <span className="settings-label">Security signals</span>
          <strong>{snapshot.securitySignalCount}</strong>
          <p>User-level 2FA and session posture signals across currently visible workspaces.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-compliance-flagged-count">
          <span className="settings-label">Needs attention</span>
          <strong>{snapshot.flaggedSecurityCount}</strong>
          <p>Users missing 2FA, backup codes, or carrying multiple active sessions.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-compliance-webhook-count">
          <span className="settings-label">Pending webhooks</span>
          <strong>{snapshot.pendingWebhookCount}</strong>
          <p>Failed deliveries still waiting for operator review before replay.</p>
        </article>
      </div>

      <div className="platform-quick-grid">
        <article className="platform-quick-item">
          <div>
            <span className="settings-label">Back</span>
            <strong>Platform dashboard</strong>
            <p>Return to the broader tenant ops surface and jump back into users, billing, or tenant detail.</p>
          </div>
          <Link href="/platform" className="audit-log-details-button" data-testid="platform-compliance-back-home">
            Open platform dashboard
          </Link>
        </article>
      </div>

      <div className="platform-toolbar" data-testid="platform-compliance-toolbar">
        <label htmlFor="platform-compliance-search">
          Search compliance signals
          <input
            id="platform-compliance-search"
            type="search"
            placeholder="Search by tenant, user, action, or reason"
            value={query}
            data-testid="platform-compliance-search-input"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="platform-compliance-layout">
        <section className="platform-tenant-detail-card" data-testid="platform-compliance-audit-feed">
          <div className="platform-tenant-detail-section-header">
            <div>
              <h2>Global audit feed</h2>
              <p>Recent tenant and platform-origin actions from across the starter environment.</p>
            </div>
          </div>

          {filteredAuditEvents.length > 0 ? (
            <div className="platform-compliance-list" data-testid="platform-compliance-audit-list">
              {filteredAuditEvents.map((event) => (
                <article className="platform-compliance-row" key={event.id} data-testid={`platform-compliance-audit-${event.id}`}>
                  <div>
                    <div className="platform-compliance-row-heading">
                      <strong>{event.summary}</strong>
                      <span className={`security-status-badge ${event.origin === "platform" ? "is-pending" : "is-neutral"}`}>
                        {event.origin === "platform" ? "Platform" : "Tenant"}
                      </span>
                    </div>
                    <p>{event.tenantName} · {event.action}</p>
                    <p>{event.actorEmail} · {formatTimestamp(event.occurredAt)}</p>
                    {typeof event.metadata.reason === "string" ? <p>Reason: {event.metadata.reason}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="team-empty-state" data-testid="platform-compliance-audit-empty">
              No audit events matched the current search.
            </div>
          )}
        </section>

        <section className="platform-tenant-detail-card" data-testid="platform-compliance-security-feed">
          <div className="platform-tenant-detail-section-header">
            <div>
              <h2>Security posture</h2>
              <p>Cross-tenant user signals showing 2FA readiness, backup-code coverage, and active-session posture.</p>
            </div>
          </div>

          {filteredSecuritySignals.length > 0 ? (
            <div className="platform-compliance-list" data-testid="platform-compliance-security-list">
              {filteredSecuritySignals.map((signal) => (
                <article className="platform-compliance-row" key={signal.id} data-testid={`platform-compliance-signal-${signal.userId}`}>
                  <div>
                    <div className="platform-compliance-row-heading">
                      <strong>{signal.fullName}</strong>
                      <span className={`security-status-badge ${signal.status === "Needs attention" ? "is-pending" : "is-good"}`}>
                        {signal.status}
                      </span>
                    </div>
                    <p>{signal.email}</p>
                    <p>{signal.summary}</p>
                    <p>
                      Tenants: {signal.tenantNames.length > 0 ? signal.tenantNames.join(", ") : "No tenant context yet"} · Last seen: {formatTimestamp(signal.lastSeenAt)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="team-empty-state" data-testid="platform-compliance-security-empty">
              No security signals matched the current search.
            </div>
          )}
        </section>
      </div>

      <PlatformWebhookJobsConsole embedded initialSnapshot={snapshot.webhookJobs} />
    </section>
  );
}
