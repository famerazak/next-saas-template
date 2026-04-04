"use client";

import { useMemo, useState } from "react";
import { AuditLogList } from "@/components/audit-log-list";
import type { TenantAuditEvent } from "@/lib/audit/store";

type AuditLogConsoleProps = {
  events: TenantAuditEvent[];
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function AuditLogConsole({ events }: AuditLogConsoleProps) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState<"all" | "tenant" | "platform">("all");

  const actionOptions = useMemo(
    () => [...new Set(events.map((event) => event.action))].sort((left, right) => left.localeCompare(right)),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);

    return events.filter((event) => {
      if (actionFilter !== "all" && event.action !== actionFilter) {
        return false;
      }

      if (originFilter !== "all" && event.origin !== originFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        event.summary,
        event.action,
        event.actorEmail,
        event.actorName,
        event.actorRole,
        event.targetLabel ?? "",
        event.targetType ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [actionFilter, events, originFilter, query]);

  return (
    <section className="auth-card settings-card audit-log-card" data-testid="audit-log-console">
      <div className="settings-header">
        <div>
          <h2>Audit activity</h2>
          <p className="auth-subtitle">Search the current tenant history and narrow it to the actions you need.</p>
        </div>
        <div className="audit-log-toolbar-actions">
          <button
            type="button"
            className="audit-log-export-button"
            data-testid="audit-export-csv-button"
            disabled
            title="CSV export lands in S42."
          >
            Export CSV
          </button>
          <button
            type="button"
            className="audit-log-export-button"
            data-testid="audit-export-json-button"
            disabled
            title="JSON export lands in S42."
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="audit-log-toolbar" data-testid="audit-log-toolbar">
        <label htmlFor="audit-search">
          Search
          <input
            id="audit-search"
            type="search"
            placeholder="Search actor, action, or target"
            value={query}
            data-testid="audit-log-search-input"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <label htmlFor="audit-action-filter">
          Action
          <select
            id="audit-action-filter"
            value={actionFilter}
            data-testid="audit-log-action-filter"
            onChange={(event) => setActionFilter(event.currentTarget.value)}
          >
            <option value="all">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="audit-origin-filter">
          Origin
          <select
            id="audit-origin-filter"
            value={originFilter}
            data-testid="audit-log-origin-filter"
            onChange={(event) => setOriginFilter(event.currentTarget.value as "all" | "tenant" | "platform")}
          >
            <option value="all">All origins</option>
            <option value="tenant">Tenant</option>
            <option value="platform">Platform</option>
          </select>
        </label>
      </div>

      <div className="audit-log-results-summary" data-testid="audit-log-results-summary">
        Showing {filteredEvents.length} of {events.length} events
      </div>

      <AuditLogList events={filteredEvents} />
    </section>
  );
}
