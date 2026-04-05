import type { TenantAuditEvent } from "@/lib/audit/store";

type AuditLogListProps = {
  events: TenantAuditEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: TenantAuditEvent) => void;
};

function formatOccurredAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function AuditLogList({ events, selectedEventId, onSelectEvent }: AuditLogListProps) {
  if (events.length === 0) {
    return (
      <div className="audit-log-list" data-testid="audit-log-list">
        <div className="team-empty-state" data-testid="audit-log-empty">
          No audit events recorded yet.
        </div>
      </div>
    );
  }

  return (
    <div className="audit-log-list" data-testid="audit-log-list">
      {events.map((event) => (
        <article
          className={`audit-log-row${selectedEventId === event.id ? " is-selected" : ""}`}
          key={event.id}
          data-testid={`audit-log-row-${event.id}`}
        >
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
            {event.origin === "platform" && typeof event.metadata.reason === "string" ? (
              <p className="audit-log-platform-reason" data-testid={`audit-log-platform-reason-${event.id}`}>
                Reason: {event.metadata.reason}
              </p>
            ) : null}
            <button
              type="button"
              className="audit-log-details-button"
              onClick={() => onSelectEvent(event)}
              data-testid={`audit-log-view-details-${event.id}`}
            >
              View details
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
