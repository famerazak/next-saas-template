"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PlatformUserRecord, PlatformUsersSnapshot } from "@/lib/platform/users";

type PlatformUsersDirectoryProps = {
  adminEmail: string;
  snapshot: PlatformUsersSnapshot;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function PlatformUsersDirectory({ adminEmail, snapshot }: PlatformUsersDirectoryProps) {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(snapshot.users[0]?.userId ?? null);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
      return snapshot.users;
    }

    return snapshot.users.filter((user) => {
      const haystack = [
        user.email,
        user.fullName,
        user.memberships.map((membership) => `${membership.tenantName} ${membership.role}`).join(" ")
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, snapshot.users]);

  useEffect(() => {
    if (filteredUsers.length === 0) {
      setSelectedUserId(null);
      return;
    }

    const existing = filteredUsers.find((user) => user.userId === selectedUserId);
    if (!existing) {
      setSelectedUserId(filteredUsers[0]?.userId ?? null);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser = filteredUsers.find((user) => user.userId === selectedUserId) ?? null;

  return (
    <section className="auth-card platform-users-card" data-testid="platform-users-page">
      <div className="settings-header">
        <div>
          <span className="settings-label">Platform Admin</span>
          <h1>Users directory</h1>
          <p className="auth-subtitle">
            Search global users across customer tenants and inspect each user&apos;s active memberships in one place.
          </p>
        </div>
        <span className="security-status-badge is-pending" data-testid="platform-users-admin-badge">
          {adminEmail}
        </span>
      </div>

      <div className="platform-kpi-grid">
        <article className="platform-kpi-card" data-testid="platform-users-count">
          <span className="settings-label">Users</span>
          <strong>{snapshot.userCount}</strong>
          <p>Distinct users visible to platform operations.</p>
        </article>
        <article className="platform-kpi-card" data-testid="platform-user-membership-count">
          <span className="settings-label">Memberships</span>
          <strong>{snapshot.membershipCount}</strong>
          <p>Total active tenant memberships represented in the directory.</p>
        </article>
      </div>

      <div className="platform-quick-grid">
        <article className="platform-quick-item">
          <div>
            <span className="settings-label">Workspace ops</span>
            <strong>Back to platform dashboard</strong>
            <p>Return to tenant KPIs, billing status, and workspace-level operator controls.</p>
          </div>
          <Link href="/platform" className="audit-log-details-button" data-testid="platform-users-back-dashboard">
            Open dashboard
          </Link>
        </article>
      </div>

      <div className="platform-toolbar" data-testid="platform-users-toolbar">
        <label htmlFor="platform-user-search">
          Search users
          <input
            id="platform-user-search"
            type="search"
            placeholder="Search by user, tenant, or role"
            data-testid="platform-user-search-input"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="platform-results-summary" data-testid="platform-user-results-summary">
        Showing {filteredUsers.length} of {snapshot.userCount} users
      </div>

      <div className="platform-dashboard-layout">
        <div className="platform-user-list" data-testid="platform-user-list">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <article
                className={`platform-user-card${selectedUserId === user.userId ? " is-selected" : ""}`}
                key={user.userId}
                data-testid={`platform-user-card-${user.userId}`}
              >
                <div className="platform-user-card-copy">
                  <div className="platform-user-card-heading">
                    <div>
                      <strong>{user.fullName}</strong>
                      <p>{user.email}</p>
                    </div>
                    <span className="security-status-badge is-neutral">
                      {user.memberships.length} memberships
                    </span>
                  </div>
                  <div className="platform-user-card-meta">
                    {user.memberships.map((membership) => (
                      <span key={`${user.userId}-${membership.tenantId}`}>
                        {membership.tenantName} · {membership.role}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="audit-log-details-button"
                  onClick={() => setSelectedUserId(user.userId)}
                  data-testid={`platform-user-open-${user.userId}`}
                >
                  Open user
                </button>
              </article>
            ))
          ) : (
            <div className="team-empty-state" data-testid="platform-user-empty">
              No users matched the current search.
            </div>
          )}
        </div>

        <aside className="platform-tenant-detail" data-testid="platform-user-detail">
          {selectedUser ? (
            <>
              <div className="platform-tenant-detail-header">
                <div>
                  <span className="settings-label">User detail</span>
                  <h2 data-testid="platform-user-detail-name">{selectedUser.fullName}</h2>
                  <p className="auth-subtitle" data-testid="platform-user-detail-email">
                    {selectedUser.email}
                  </p>
                </div>
                <span className="security-status-badge is-neutral" data-testid="platform-user-detail-membership-count">
                  {selectedUser.memberships.length} memberships
                </span>
              </div>

              <article className="platform-tenant-detail-card" data-testid="platform-user-detail-memberships">
                <div className="platform-tenant-detail-section-header">
                  <div>
                    <h3>Memberships</h3>
                    <p>Active tenant roles currently tied to this user.</p>
                  </div>
                </div>
                <div className="platform-membership-list">
                  {selectedUser.memberships.map((membership) => (
                    <div
                      className="platform-membership-row"
                      key={`${selectedUser.userId}-${membership.tenantId}`}
                      data-testid={`platform-user-membership-${membership.tenantId}`}
                    >
                      <div>
                        <strong>{membership.tenantName}</strong>
                        <p>{membership.tenantId}</p>
                      </div>
                      <div className="platform-membership-row-meta">
                        <span className="team-badge team-badge-pending">{membership.role}</span>
                        <span className="security-status-badge is-neutral">{membership.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </>
          ) : (
            <div className="team-empty-state" data-testid="platform-user-detail-empty">
              Select a user to inspect memberships.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
