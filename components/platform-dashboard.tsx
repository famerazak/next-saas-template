"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EditableTeamRole, TeamMember } from "@/lib/team/store";
import type { PlatformDashboardSnapshot, PlatformTenantRecord } from "@/lib/platform/dashboard";

type PlatformDashboardProps = {
  adminEmail: string;
  snapshot: PlatformDashboardSnapshot;
};

type PlatformStatusFilter = "all" | "attention" | "active-billing" | "trial";

type PlatformRoleUpdateResponse = {
  error?: string;
  member?: TeamMember;
  previousRole?: TeamMember["role"];
};

const EDITABLE_ROLES: EditableTeamRole[] = ["Admin", "Member", "Viewer"];

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

function countAdminRoles(members: TeamMember[]) {
  return members.filter((member) => member.role === "Owner" || member.role === "Admin").length;
}

function ownerEmailForMembers(members: TeamMember[]) {
  return members.find((member) => member.role === "Owner")?.email ?? "";
}

export function PlatformDashboard({ adminEmail, snapshot }: PlatformDashboardProps) {
  const [tenants, setTenants] = useState(snapshot.tenants);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlatformStatusFilter>("all");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(snapshot.tenants[0]?.tenantId ?? null);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, EditableTeamRole>>({});
  const [operatorReason, setOperatorReason] = useState("");
  const [savingMemberId, setSavingMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredTenants = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);

    return tenants.filter((tenant) => {
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
  }, [query, statusFilter, tenants]);

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
    if (!selectedTenant) {
      return;
    }

    setMemberRoleDrafts((current) => ({
      ...Object.fromEntries(
        selectedTenant.members
          .filter((member) => member.role !== "Owner")
          .map((member) => [member.id, member.role as EditableTeamRole])
      ),
      ...current
    }));
  }, [selectedTenant]);

  async function updateMemberRole(member: TeamMember) {
    const nextRole = memberRoleDrafts[member.id] ?? (member.role === "Owner" ? "Member" : member.role);
    const reason = operatorReason.trim();

    if (reason.length < 8 || reason.length > 240) {
      setMessage("");
      setError("Enter an operator reason between 8 and 240 characters.");
      return;
    }

    if (!selectedTenant) {
      setMessage("");
      setError("Select a tenant before updating member roles.");
      return;
    }

    setSavingMemberId(member.id);
    setMessage("");
    setError("");

    const response = await fetch("/api/platform/tenant-member-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenantId: selectedTenant.tenantId,
        targetUserId: member.id,
        role: nextRole,
        reason
      })
    });

    const payload = (await response.json().catch(() => null)) as PlatformRoleUpdateResponse | null;
    if (!response.ok || !payload?.member) {
      setSavingMemberId("");
      setMessage("");
      setError(payload?.error ?? "Could not update tenant member role.");
      return;
    }

    const updatedMember = payload.member;

    setTenants((currentTenants) =>
      currentTenants.map((tenant) => {
        if (tenant.tenantId !== selectedTenant.tenantId) {
          return tenant;
        }

        const nextMembers = tenant.members.map((existingMember) =>
          existingMember.id === updatedMember.id ? updatedMember : existingMember
        );

        return {
          ...tenant,
          members: nextMembers,
          adminCount: countAdminRoles(nextMembers),
          ownerEmail: ownerEmailForMembers(nextMembers)
        };
      })
    );
    setMemberRoleDrafts((current) => ({
      ...current,
      [member.id]: updatedMember.role === "Owner" ? "Member" : (updatedMember.role as EditableTeamRole)
    }));
    setSavingMemberId("");
    setOperatorReason("");
    setError("");
    setMessage(
      payload.previousRole && payload.previousRole !== updatedMember.role
        ? `${updatedMember.email} changed from ${payload.previousRole} to ${updatedMember.role}.`
        : `${updatedMember.email} is now ${updatedMember.role}.`
    );
  }

  const tenantCount = tenants.length;
  const memberCount = tenants.reduce((total, tenant) => total + tenant.memberCount, 0);
  const attentionCount = tenants.filter((tenant) => tenant.status === "Attention").length;
  const activeBillingCount = tenants.filter((tenant) => tenant.status === "Active billing").length;

  return (
    <section className="auth-card platform-dashboard-card" data-testid="platform-home-page">
      <div data-testid="platform-dashboard-page">
        <div className="settings-header">
          <div>
            <span className="settings-label">Platform Admin</span>
            <h1>Platform operations</h1>
            <p className="auth-subtitle">
              Search tenant workspaces, monitor account health, inspect members plus billing state, and resolve access
              problems without leaving the platform area.
            </p>
          </div>
          <span className="security-status-badge is-pending" data-testid="platform-dashboard-admin-badge">
            {adminEmail}
          </span>
        </div>

        <div className="platform-kpi-grid" data-testid="platform-kpi-grid">
          <article className="platform-kpi-card" data-testid="platform-kpi-tenants">
            <span className="settings-label">Tenants</span>
            <strong>{tenantCount}</strong>
            <p>Total workspaces currently visible to platform operations.</p>
          </article>
          <article className="platform-kpi-card" data-testid="platform-kpi-members">
            <span className="settings-label">Members</span>
            <strong>{memberCount}</strong>
            <p>Combined active member count across all visible tenants.</p>
          </article>
          <article className="platform-kpi-card" data-testid="platform-kpi-attention">
            <span className="settings-label">Attention</span>
            <strong>{attentionCount}</strong>
            <p>Tenants with pending dead letters or reliability issues needing review.</p>
          </article>
          <article className="platform-kpi-card" data-testid="platform-kpi-active-billing">
            <span className="settings-label">Active billing</span>
            <strong>{activeBillingCount}</strong>
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
          Showing {filteredTenants.length} of {tenantCount} tenants
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
                      <p>Change non-owner tenant roles directly from the platform area. Every change requires an operator reason.</p>
                    </div>
                  </div>

                  {message ? (
                    <p role="status" className="auth-success" data-testid="platform-member-role-success">
                      {message}
                    </p>
                  ) : null}
                  {error ? (
                    <p role="alert" className="auth-error" data-testid="platform-member-role-error">
                      {error}
                    </p>
                  ) : null}

                  <label className="platform-role-reason-field" htmlFor="platform-member-role-reason">
                    Operator reason
                    <textarea
                      id="platform-member-role-reason"
                      className="platform-role-reason-input"
                      value={operatorReason}
                      maxLength={240}
                      placeholder="Explain why the tenant role change is needed"
                      data-testid="platform-member-role-reason-input"
                      onChange={(event) => setOperatorReason(event.currentTarget.value)}
                    />
                  </label>

                  <div className="platform-members-list">
                    {selectedTenant.members.map((member) => {
                      const isOwner = member.role === "Owner";
                      const draftRole =
                        memberRoleDrafts[member.id] ?? (member.role === "Owner" ? "Member" : (member.role as EditableTeamRole));
                      const roleChanged = !isOwner && draftRole !== member.role;
                      const isSaving = savingMemberId === member.id;

                      return (
                        <div className="platform-member-row" key={member.id} data-testid={`platform-member-${member.id}`}>
                          <div>
                            <strong>{member.fullName || member.email}</strong>
                            <p>{member.email}</p>
                          </div>
                          <div className="platform-member-actions">
                            {isOwner ? (
                              <span
                                className="team-badge team-badge-pending"
                                data-testid={`platform-member-role-value-${member.id}`}
                              >
                                Owner
                              </span>
                            ) : (
                              <>
                                <select
                                  className="platform-member-role-select"
                                  aria-label={`Platform role for ${member.email}`}
                                  data-testid={`platform-member-role-select-${member.id}`}
                                  value={draftRole}
                                  onChange={(event) => {
                                    const nextRole = event.currentTarget.value as EditableTeamRole;
                                    setMemberRoleDrafts((current) => ({
                                      ...current,
                                      [member.id]: nextRole
                                    }));
                                  }}
                                >
                                  {EDITABLE_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="audit-log-details-button"
                                  disabled={!roleChanged || isSaving}
                                  data-testid={`platform-member-role-save-${member.id}`}
                                  onClick={() => updateMemberRole(member)}
                                >
                                  {isSaving ? "Saving..." : "Save role"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="platform-tenant-detail-card" data-testid="platform-tenant-detail-billing">
                  <div className="platform-tenant-detail-section-header">
                    <div>
                      <h3>Billing</h3>
                      <p>Plan, invoice, and delivery status for the selected tenant.</p>
                    </div>
                    <Link
                      href="/platform/webhooks-jobs"
                      className="audit-log-details-button"
                      data-testid="platform-detail-open-webhooks"
                    >
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
