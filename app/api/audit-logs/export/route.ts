import { NextResponse } from "next/server";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadTenantAuditEventsForSession, type TenantAuditEvent } from "@/lib/audit/store";

type ExportFormat = "csv" | "json";

function parseFormat(value: string | null): ExportFormat | null {
  if (value === "csv" || value === "json") {
    return value;
  }

  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "workspace";
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}

function toCsv(events: TenantAuditEvent[]): string {
  const header = [
    "event_id",
    "tenant_id",
    "action",
    "summary",
    "actor_email",
    "actor_name",
    "actor_role",
    "origin",
    "target_type",
    "target_id",
    "target_label",
    "occurred_at",
    "metadata"
  ];

  const rows = events.map((event) =>
    [
      event.id,
      event.tenantId,
      event.action,
      event.summary,
      event.actorEmail,
      event.actorName,
      event.actorRole,
      event.origin,
      event.targetType ?? "",
      event.targetId ?? "",
      event.targetLabel ?? "",
      event.occurredAt,
      JSON.stringify(event.metadata)
    ]
      .map((value) => escapeCsv(String(value)))
      .join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

function toJson(events: TenantAuditEvent[]) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      eventCount: events.length,
      events
    },
    null,
    2
  );
}

export async function GET(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessTenantAdminArea(session)) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = parseFormat(url.searchParams.get("format"));
  if (!format) {
    return NextResponse.json({ error: "Export format must be csv or json." }, { status: 400 });
  }

  const events = await loadTenantAuditEventsForSession(session, { limit: 2000 });
  const tenantSlug = slugify(session.tenantName ?? session.tenantId ?? "workspace");
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${tenantSlug}-audit-logs-${dateStamp}.${format}`;
  const body = format === "csv" ? toCsv(events) : toJson(events);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store"
    }
  });
}
