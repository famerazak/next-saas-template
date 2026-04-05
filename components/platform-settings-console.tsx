"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PlatformGlobalFlags, PlatformSettingsSnapshot, PlatformSystemDefaults, TenantFlagOverrides } from "@/lib/platform/settings";

type PlatformSettingsConsoleProps = {
  adminEmail: string;
  snapshot: PlatformSettingsSnapshot;
};

type SettingsResponse = {
  error?: string;
  snapshot?: PlatformSettingsSnapshot;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function PlatformSettingsConsole({ adminEmail, snapshot }: PlatformSettingsConsoleProps) {
  const [data, setData] = useState(snapshot);
  const [query, setQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(snapshot.tenants[0]?.tenantId ?? null);

  const [globalFlags, setGlobalFlags] = useState<PlatformGlobalFlags>(snapshot.globalFlags);
  const [systemDefaults, setSystemDefaults] = useState<PlatformSystemDefaults>(snapshot.systemDefaults);
  const [tenantDrafts, setTenantDrafts] = useState<Record<string, TenantFlagOverrides>>(
    Object.fromEntries(snapshot.tenants.map((tenant) => [tenant.tenantId, tenant.overrides]))
  );

  const [globalMessage, setGlobalMessage] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [tenantMessage, setTenantMessage] = useState("");
  const [tenantError, setTenantError] = useState("");
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);

  const filteredTenants = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
      return data.tenants;
    }

    return data.tenants.filter((tenant) =>
      [tenant.tenantName, tenant.tenantId, tenant.ownerEmail].join(" ").toLowerCase().includes(normalizedQuery)
    );
  }, [data.tenants, query]);

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

  function syncSnapshot(next: PlatformSettingsSnapshot) {
    setData(next);
    setGlobalFlags(next.globalFlags);
    setSystemDefaults(next.systemDefaults);
    setTenantDrafts(Object.fromEntries(next.tenants.map((tenant) => [tenant.tenantId, tenant.overrides])));
  }

  async function saveGlobalSettings() {
    setSavingGlobal(true);
    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch("/api/platform/system-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        globalFlags,
        systemDefaults: {
          ...systemDefaults,
          auditRetentionDays: Number(systemDefaults.auditRetentionDays),
          sessionRetentionDays: Number(systemDefaults.sessionRetentionDays)
        }
      })
    });

    const payload = (await response.json().catch(() => null)) as SettingsResponse | null;
    setSavingGlobal(false);

    if (!response.ok || !payload?.snapshot) {
      setGlobalError(payload?.error ?? "Could not update platform system settings.");
      return;
    }

    syncSnapshot(payload.snapshot);
    setGlobalMessage("Platform system settings updated.");
  }

  async function saveTenantOverrides() {
    if (!selectedTenant) {
      setTenantError("Select a tenant before saving tenant-scoped flags.");
      setTenantMessage("");
      return;
    }

    setSavingTenant(true);
    setTenantMessage("");
    setTenantError("");

    const response = await fetch("/api/platform/tenant-flags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenantId: selectedTenant.tenantId,
        ...tenantDrafts[selectedTenant.tenantId]
      })
    });

    const payload = (await response.json().catch(() => null)) as SettingsResponse | null;
    setSavingTenant(false);

    if (!response.ok || !payload?.snapshot) {
      setTenantError(payload?.error ?? "Could not update tenant feature flags.");
      return;
    }

    syncSnapshot(payload.snapshot);
    setTenantMessage(`Tenant flags updated for ${selectedTenant.tenantName}.`);
  }

  const tenantsWithPrioritySupport = data.tenants.filter((tenant) => tenant.overrides.prioritySupportEnabled).length;
  const tenantsWithStrictExports = data.tenants.filter((tenant) => tenant.overrides.strictAuditExports).length;

  return (
    <section className="auth-card platform-settings-card" data-testid="platform-settings-page">
      <div className="settings-header">
        <div>
          <span className="settings-label">Platform Admin</span>
          <h1>Feature flags and system settings</h1>
          <p className="auth-subtitle">
            Tune global starter defaults and set tenant-scoped overrides without leaving the platform area.
          </p>
        </div>
        <span className="security-status-badge is-pending" data-testid="platform-settings-admin-badge">
          {adminEmail}
        </span>
      </div>

      <div className="platform-kpi-grid">
        <article className="platform-kpi-card" data-testid="platform-settings-tenant-count">
          <span className="settings-label">Tenants</span>
          <strong>{data.tenants.length}</strong>
          <p>Workspaces currently available for tenant-scoped platform overrides.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-settings-priority-support-count">
          <span className="settings-label">Priority support</span>
          <strong>{tenantsWithPrioritySupport}</strong>
          <p>Tenants currently marked for higher-touch support handling.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-settings-strict-export-count">
          <span className="settings-label">Strict exports</span>
          <strong>{tenantsWithStrictExports}</strong>
          <p>Tenants with tighter audit export handling enabled.</p>
        </article>
      </div>

      <div className="platform-quick-grid">
        <article className="platform-quick-item" data-testid="platform-home-card-settings">
          <div>
            <span className="settings-label">Back</span>
            <strong>Platform dashboard</strong>
            <p>Return to the platform home view and jump into tenant detail, compliance, or operational workflows.</p>
          </div>
          <Link href="/platform" className="audit-log-details-button" data-testid="platform-settings-back-home">
            Open platform dashboard
          </Link>
        </article>
      </div>

      <div className="platform-settings-layout">
        <section className="platform-tenant-detail-card" data-testid="platform-global-settings-card">
          <div className="platform-tenant-detail-section-header">
            <div>
              <h2>Global defaults</h2>
              <p>System-wide defaults that shape how new workspaces behave in the starter environment.</p>
            </div>
          </div>

          {globalMessage ? (
            <p role="status" className="auth-success" data-testid="platform-global-settings-success">
              {globalMessage}
            </p>
          ) : null}
          {globalError ? (
            <p role="alert" className="auth-error" data-testid="platform-global-settings-error">
              {globalError}
            </p>
          ) : null}

          <div className="platform-settings-toggle-list">
            <label className="platform-settings-toggle">
              <input
                type="checkbox"
                checked={globalFlags.auditExportsEnabled}
                data-testid="platform-global-flag-audit-exports"
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setGlobalFlags((current) => ({ ...current, auditExportsEnabled: checked }));
                }}
              />
              <span>Audit exports enabled</span>
            </label>
            <label className="platform-settings-toggle">
              <input
                type="checkbox"
                checked={globalFlags.billingSelfServeEnabled}
                data-testid="platform-global-flag-billing-self-serve"
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setGlobalFlags((current) => ({ ...current, billingSelfServeEnabled: checked }));
                }}
              />
              <span>Billing self-serve enabled</span>
            </label>
            <label className="platform-settings-toggle">
              <input
                type="checkbox"
                checked={globalFlags.complianceExplorerEnabled}
                data-testid="platform-global-flag-compliance-explorer"
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setGlobalFlags((current) => ({ ...current, complianceExplorerEnabled: checked }));
                }}
              />
              <span>Compliance explorer enabled</span>
            </label>
          </div>

          <div className="platform-ops-form-grid">
            <label htmlFor="platform-audit-retention-days">
              Audit retention (days)
              <input
                id="platform-audit-retention-days"
                type="number"
                min="30"
                max="3650"
                value={systemDefaults.auditRetentionDays}
                data-testid="platform-audit-retention-days"
                onChange={(event) => {
                  const auditRetentionDays = Number(event.currentTarget.value);
                  setSystemDefaults((current) => ({ ...current, auditRetentionDays }));
                }}
              />
            </label>
            <label htmlFor="platform-session-retention-days">
              Session retention (days)
              <input
                id="platform-session-retention-days"
                type="number"
                min="7"
                max="365"
                value={systemDefaults.sessionRetentionDays}
                data-testid="platform-session-retention-days"
                onChange={(event) => {
                  const sessionRetentionDays = Number(event.currentTarget.value);
                  setSystemDefaults((current) => ({
                    ...current,
                    sessionRetentionDays
                  }));
                }}
              />
            </label>
            <label htmlFor="platform-tenant-2fa-default">
              Tenant 2FA default
              <select
                id="platform-tenant-2fa-default"
                value={systemDefaults.tenantTwoFactorDefault}
                data-testid="platform-tenant-2fa-default"
                onChange={(event) => {
                  const tenantTwoFactorDefault = event.currentTarget
                    .value as PlatformSystemDefaults["tenantTwoFactorDefault"];
                  setSystemDefaults((current) => ({
                    ...current,
                    tenantTwoFactorDefault
                  }));
                }}
              >
                <option value="optional">Optional</option>
                <option value="recommended">Recommended</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="billing-payment-button"
            disabled={savingGlobal}
            data-testid="platform-global-settings-save"
            onClick={saveGlobalSettings}
          >
            {savingGlobal ? "Saving..." : "Save global settings"}
          </button>
        </section>

        <section className="platform-tenant-detail-card" data-testid="platform-tenant-flags-card">
          <div className="platform-tenant-detail-section-header">
            <div>
              <h2>Tenant overrides</h2>
              <p>Apply tenant-specific overrides when one workspace needs different operational treatment.</p>
            </div>
          </div>

          {tenantMessage ? (
            <p role="status" className="auth-success" data-testid="platform-tenant-flags-success">
              {tenantMessage}
            </p>
          ) : null}
          {tenantError ? (
            <p role="alert" className="auth-error" data-testid="platform-tenant-flags-error">
              {tenantError}
            </p>
          ) : null}

          <div className="platform-toolbar" data-testid="platform-tenant-flags-toolbar">
            <label htmlFor="platform-tenant-flags-search">
              Search tenants
              <input
                id="platform-tenant-flags-search"
                type="search"
                placeholder="Search by tenant or owner"
                value={query}
                data-testid="platform-tenant-flags-search"
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            </label>
          </div>

          <div className="platform-settings-tenant-layout">
            <div className="platform-tenant-list" data-testid="platform-tenant-flags-list">
              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => (
                  <article
                    key={tenant.tenantId}
                    className={`platform-tenant-card${selectedTenantId === tenant.tenantId ? " is-selected" : ""}`}
                    data-testid={`platform-tenant-flags-card-${tenant.tenantId}`}
                  >
                    <div className="platform-tenant-card-copy">
                      <div className="platform-tenant-card-heading">
                        <div>
                          <strong>{tenant.tenantName}</strong>
                          <p>{tenant.ownerEmail || tenant.tenantId}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="audit-log-details-button"
                      data-testid={`platform-tenant-flags-open-${tenant.tenantId}`}
                      onClick={() => setSelectedTenantId(tenant.tenantId)}
                    >
                      Open detail
                    </button>
                  </article>
                ))
              ) : (
                <div className="team-empty-state" data-testid="platform-tenant-flags-empty">
                  No tenants matched the current search.
                </div>
              )}
            </div>

            <div className="platform-tenant-detail" data-testid="platform-tenant-flags-detail">
              {selectedTenant ? (
                <>
                  <div className="platform-tenant-detail-header">
                    <div>
                      <span className="settings-label">Tenant override</span>
                      <h3 data-testid="platform-tenant-flags-detail-name">{selectedTenant.tenantName}</h3>
                      <p className="auth-subtitle">{selectedTenant.tenantId}</p>
                    </div>
                  </div>

                  <div className="platform-settings-toggle-list">
                    <label className="platform-settings-toggle">
                      <input
                        type="checkbox"
                        checked={tenantDrafts[selectedTenant.tenantId]?.betaWorkspaceEnabled ?? false}
                        data-testid="platform-tenant-flag-beta-workspace"
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setTenantDrafts((current) => ({
                            ...current,
                            [selectedTenant.tenantId]: {
                              ...current[selectedTenant.tenantId],
                              betaWorkspaceEnabled: checked
                            }
                          }));
                        }}
                      />
                      <span>Beta workspace enabled</span>
                    </label>
                    <label className="platform-settings-toggle">
                      <input
                        type="checkbox"
                        checked={tenantDrafts[selectedTenant.tenantId]?.prioritySupportEnabled ?? false}
                        data-testid="platform-tenant-flag-priority-support"
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setTenantDrafts((current) => ({
                            ...current,
                            [selectedTenant.tenantId]: {
                              ...current[selectedTenant.tenantId],
                              prioritySupportEnabled: checked
                            }
                          }));
                        }}
                      />
                      <span>Priority support enabled</span>
                    </label>
                    <label className="platform-settings-toggle">
                      <input
                        type="checkbox"
                        checked={tenantDrafts[selectedTenant.tenantId]?.strictAuditExports ?? false}
                        data-testid="platform-tenant-flag-strict-exports"
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setTenantDrafts((current) => ({
                            ...current,
                            [selectedTenant.tenantId]: {
                              ...current[selectedTenant.tenantId],
                              strictAuditExports: checked
                            }
                          }));
                        }}
                      />
                      <span>Strict audit exports</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="billing-payment-button"
                    disabled={savingTenant}
                    data-testid="platform-tenant-flags-save"
                    onClick={saveTenantOverrides}
                  >
                    {savingTenant ? "Saving..." : "Save tenant overrides"}
                  </button>
                </>
              ) : (
                <div className="team-empty-state" data-testid="platform-tenant-flags-detail-empty">
                  Select a tenant to edit overrides.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
