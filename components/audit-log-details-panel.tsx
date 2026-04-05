import type { TenantAuditEvent } from "@/lib/audit/store";

type AuditLogDetailsPanelProps = {
  event: TenantAuditEvent | null;
};

function formatOccurredAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatMetadataLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatMetadataValue(value: string | number | boolean | null) {
  if (value === null) {
    return "None";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

export function AuditLogDetailsPanel({ event }: AuditLogDetailsPanelProps) {
  if (!event) {
    return (
      <aside className="audit-log-details-panel" data-testid="audit-log-details-panel">
        <div className="audit-log-details-empty" data-testid="audit-log-details-empty">
          <strong>Select an event</strong>
          <p>Choose any audit row to inspect its actor, target, and raw metadata in detail.</p>
        </div>
      </aside>
    );
  }

  const metadataEntries = Object.entries(event.metadata);

  return (
    <aside className="audit-log-details-panel" data-testid="audit-log-details-panel">
      <div className="audit-log-details-header">
        <div>
          <span className="settings-label">Event details</span>
          <h3 data-testid="audit-log-details-summary">{event.summary}</h3>
        </div>
        <span className={`security-status-badge ${event.origin === "platform" ? "is-pending" : "is-neutral"}`}>
          {event.origin === "platform" ? "Platform" : "Tenant"}
        </span>
      </div>

      <dl className="audit-log-details-grid">
        <div className="audit-log-details-item">
          <dt>Event ID</dt>
          <dd data-testid="audit-log-details-id">{event.id}</dd>
        </div>
        <div className="audit-log-details-item">
          <dt>Action</dt>
          <dd data-testid="audit-log-details-action">{event.action}</dd>
        </div>
        <div className="audit-log-details-item">
          <dt>Occurred</dt>
          <dd data-testid="audit-log-details-occurred-at">{formatOccurredAt(event.occurredAt)}</dd>
        </div>
        <div className="audit-log-details-item">
          <dt>Actor</dt>
          <dd data-testid="audit-log-details-actor">
            {event.actorName} · {event.actorEmail} · {event.actorRole}
          </dd>
        </div>
        <div className="audit-log-details-item">
          <dt>Target type</dt>
          <dd data-testid="audit-log-details-target-type">{event.targetType ?? "None"}</dd>
        </div>
        <div className="audit-log-details-item">
          <dt>Target label</dt>
          <dd data-testid="audit-log-details-target-label">{event.targetLabel ?? "None"}</dd>
        </div>
      </dl>

      <section className="audit-log-metadata-section">
        <div className="audit-log-metadata-header">
          <h4>Metadata</h4>
          <span data-testid="audit-log-details-metadata-count">{metadataEntries.length} fields</span>
        </div>

        {metadataEntries.length > 0 ? (
          <dl className="audit-log-metadata-list" data-testid="audit-log-details-metadata-list">
            {metadataEntries.map(([key, value]) => (
              <div className="audit-log-metadata-item" key={key}>
                <dt>{formatMetadataLabel(key)}</dt>
                <dd data-testid={`audit-log-details-metadata-${key}`}>{formatMetadataValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="team-empty-state" data-testid="audit-log-details-no-metadata">
            No structured metadata was recorded for this event.
          </div>
        )}
      </section>
    </aside>
  );
}
