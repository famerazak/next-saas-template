import Link from "next/link";

type PlatformHomePanelProps = {
  adminEmail: string;
};

export function PlatformHomePanel({ adminEmail }: PlatformHomePanelProps) {
  return (
    <section className="auth-card platform-home-card" data-testid="platform-home-page">
      <div className="settings-header">
        <div>
          <span className="settings-label">Platform Admin</span>
          <h1>Platform operations</h1>
          <p className="auth-subtitle">
            Centralize platform-only routes behind one protected area so operator tools stay separate from tenant admin
            surfaces.
          </p>
        </div>
        <span className="security-status-badge is-pending" data-testid="platform-home-admin-badge">
          {adminEmail}
        </span>
      </div>

      <div className="platform-home-grid">
        <article className="platform-home-item" data-testid="platform-home-card-webhooks">
          <div>
            <span className="settings-label">Reliability</span>
            <strong>Webhook jobs</strong>
            <p>Inspect dead letters, review retry history, and replay failed deliveries after the root cause is fixed.</p>
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
    </section>
  );
}
