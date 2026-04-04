import type { TenantAuditEvent } from "@/lib/audit/store";

type AuditLogListProps = {
  events: TenantAuditEvent[];
};

function formatOccurredAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function AuditLogList({ events }: AuditLogListProps) {
  if (events.length === 0) {
    return (
      <section className="auth-card settings-card audit-log-card" data-testid="audit-log-list">
        <div className="settings-header">
          <div>
            <h2>Recent activity</h2>
            <p className="auth-subtitle">Privileged tenant actions will start appearing here as the starter is used.</p>
          </div>
        </div>
        <div className="team-empty-state" data-testid="audit-log-empty">
          No audit events recorded yet.
        </div>
      </section>
    );
  }

  return (
    <section className="auth-card settings-card audit-log-card" data-testid="audit-log-list">
      <div className="settings-header">
        <div>
          <h2>Recent activity</h2>
          <p className="auth-subtitle">Latest tenant-admin and billing actions recorded for this workspace.</p>
        </div>
        <div className="team-members-count-pill" data-testid="audit-log-count">
          {events.length} events
        </div>
      </div>

      <div className="audit-log-list">
        {events.map((event) => (
          <article className="audit-log-row" key={event.id} data-testid={`audit-log-row-${event.id}`}>
            <div className="audit-log-row-copy">
              <div className="audit-log-row-heading">
                <strong>{event.summary}</strong>
                <span className={`security-status-badge ${event.origin === "platform" ? "is-pending" : "is-neutral"}`}>
                  {event.origin === "platform" ? "Platform" : "Tenant"}
                </span>
              </div>
              <p data-testid={`audit-log-actor-${event.id}`}>
                {event.actorName} · {event.actorEmail} · {event.actorRole}
              </p>
              <div className="audit-log-meta">
                <span data-testid={`audit-log-action-${event.id}`}>{event.action}</span>
                {event.targetLabel ? <span>{event.targetLabel}</span> : null}
                <span>{formatOccurredAt(event.occurredAt)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
