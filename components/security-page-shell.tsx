import type { AppSession } from "@/lib/auth/session";
import type { TwoFactorState } from "@/lib/security/two-factor";
import { TwoFactorEnrollmentCard } from "@/components/two-factor-enrollment-card";

type SecurityPageShellProps = {
  session: AppSession;
  twoFactorState: TwoFactorState;
};

type SecurityEvent = {
  title: string;
  detail: string;
  tone: "neutral" | "good" | "attention";
};

function buildSecurityEvents(session: AppSession, twoFactorState: TwoFactorState): SecurityEvent[] {
  const role = session.role ?? "Member";
  const tenantName = session.tenantName ?? "Workspace";

  return [
    {
      title: "Current session active",
      detail: `You are signed in to ${tenantName} as ${role}.`,
      tone: "good"
    },
    twoFactorState.isEnabled
      ? {
          title: "2FA enabled",
          detail: "An authenticator app is enrolled for your account.",
          tone: "good"
        }
      : {
          title: "2FA enrollment pending",
          detail: "You have not enrolled a TOTP factor yet. Start setup from the security page.",
          tone: "attention"
        },
    {
      title: "Session controls staged",
      detail: "Session review and revoke controls will plug into this page in S25.",
      tone: "neutral"
    }
  ];
}

function roleCanManagePolicy(role: AppSession["role"]) {
  return role === "Owner" || role === "Admin";
}

export function SecurityPageShell({ session, twoFactorState }: SecurityPageShellProps) {
  const events = buildSecurityEvents(session, twoFactorState);
  const canManageTenantPolicy = roleCanManagePolicy(session.role);

  return (
    <main className="page-shell">
      <section className="auth-card settings-card security-page-card" data-testid="security-page">
        <div className="settings-header">
          <div>
            <h1>Security</h1>
            <p className="auth-subtitle">
              Personal security controls live here, alongside tenant policy visibility for your workspace.
            </p>
          </div>
          <span className="security-role-pill" data-testid="security-role-pill">
            {session.role ?? "Member"}
          </span>
        </div>

        <div className="security-grid">
          <section className="security-section" data-testid="security-2fa-section">
            <div className="security-section-header">
              <div>
                <h2>Two-factor authentication</h2>
                <p className="auth-subtitle">Protect your account with a second sign-in step.</p>
              </div>
              <span className={`security-status-badge ${twoFactorState.isEnabled ? "is-good" : "is-pending"}`}>
                {twoFactorState.isEnabled ? "Enabled" : "Not enrolled"}
              </span>
            </div>
            <TwoFactorEnrollmentCard initialState={twoFactorState} />
          </section>

          <section className="security-section" data-testid="security-sessions-section">
            <div className="security-section-header">
              <div>
                <h2>Sessions</h2>
                <p className="auth-subtitle">Review where your account is active and revoke access when needed.</p>
              </div>
              <span className="security-status-badge is-pending">Coming in S25</span>
            </div>
            <div className="security-session-card" data-testid="security-current-session">
              <strong>Current session</strong>
              <span>{session.email}</span>
              <span>{session.tenantName ?? "Workspace"}</span>
            </div>
          </section>
        </div>

        <section className="security-section" data-testid="security-policy-section">
          <div className="security-section-header">
            <div>
              <h2>Tenant security policy</h2>
              <p className="auth-subtitle">
                A placeholder summary of the workspace policy surface that later slices will manage.
              </p>
            </div>
            <span className={`security-status-badge ${canManageTenantPolicy ? "is-good" : "is-neutral"}`}>
              {canManageTenantPolicy ? "Admin preview" : "View only"}
            </span>
          </div>
          <div className="security-policy-grid">
            <article className="security-policy-item">
              <span className="settings-label">2FA requirement</span>
              <strong>Optional, self-serve enrollment</strong>
              <p>Users can enroll now, but login enforcement is not forced yet.</p>
            </article>
            <article className="security-policy-item">
              <span className="settings-label">Session review</span>
              <strong>Planned</strong>
              <p>Per-user session inventory and revoke controls arrive in S25.</p>
            </article>
            <article className="security-policy-item">
              <span className="settings-label">Role impact</span>
              <strong>{canManageTenantPolicy ? "Manageable later" : "Visible only"}</strong>
              <p>
                {canManageTenantPolicy
                  ? "Owner/Admin will manage tenant-wide policy once the controls land."
                  : "Ask a tenant admin to change workspace-wide security policy when this feature is added."}
              </p>
            </article>
          </div>
        </section>

        <section className="security-section" data-testid="security-events-section">
          <div className="security-section-header">
            <div>
              <h2>Personal security events</h2>
              <p className="auth-subtitle">A starter event history for the signed-in user.</p>
            </div>
            <span className="security-status-badge is-neutral">Starter feed</span>
          </div>
          <div className="security-events-list">
            {events.map((event) => (
              <article
                key={event.title}
                className={`security-event-item tone-${event.tone}`}
                data-testid={`security-event-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
