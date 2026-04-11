import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { recordPlatformAppError } from "@/lib/platform/errors";
import {
  hasKnownPlatformBillingSupportTenant,
  loadPlatformBillingSupportSnapshot,
  recordPlatformSupportActionForPlatformAdmin,
  type PlatformSupportActionKind
} from "@/lib/platform/billing-support";

type PlatformSupportActionRequest = {
  tenantId?: string;
  ticketId?: string;
  action?: string;
  reason?: string;
};

function parseText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseAction(value: unknown): PlatformSupportActionKind | null {
  if (typeof value !== "string") {
    return null;
  }

  switch (value.toLowerCase()) {
    case "escalated":
      return "Escalated";
    case "needs customer reply":
      return "Needs customer reply";
    case "resolved":
      return "Resolved";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessPlatformAdminArea(session)) {
    return NextResponse.json({ error: "Only platform admins can update support operations." }, { status: 403 });
  }

  let body: PlatformSupportActionRequest;
  try {
    body = (await request.json()) as PlatformSupportActionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const tenantId = parseText(body.tenantId);
  const ticketId = parseText(body.ticketId);
  const action = parseAction(body.action);
  const reason = parseText(body.reason);

  if (!tenantId || !ticketId || !action) {
    return NextResponse.json(
      { error: "Tenant, ticket ID, and support action are required." },
      { status: 400 }
    );
  }

  if (!reason || reason.length < 8 || reason.length > 240) {
    return NextResponse.json(
      { error: "Enter an operator reason between 8 and 240 characters." },
      { status: 400 }
    );
  }

  const currentSnapshot = await loadPlatformBillingSupportSnapshot();
  if (!hasKnownPlatformBillingSupportTenant(tenantId, currentSnapshot)) {
    return NextResponse.json({ error: "Tenant not found in platform operations." }, { status: 404 });
  }

  try {
    const supportAction = await recordPlatformSupportActionForPlatformAdmin(tenantId, {
      ticketId,
      action,
      reason,
      actorEmail: session.email
    });

    await recordTenantAuditEventForSession(session, {
      tenantId,
      action: "platform.support.updated",
      origin: "platform",
      summary: `Platform marked support ticket ${ticketId} as ${action}.`,
      targetType: "support_case",
      targetId: supportAction.id,
      targetLabel: ticketId,
      metadata: {
        ticketId,
        action,
        reason,
        tenantId
      }
    });

    return NextResponse.json(
      {
        snapshot: await loadPlatformBillingSupportSnapshot(),
        supportActionId: supportAction.id
      },
      { status: 200 }
    );
  } catch (error) {
    await recordPlatformAppError({
      source: "platform.support-action",
      route: "/api/platform/support-action",
      message: error instanceof Error ? error.message : "Could not save support action.",
      metadata: {
        actorEmail: session.email,
        tenantId,
        ticketId
      }
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save support action." },
      { status: 400 }
    );
  }
}
