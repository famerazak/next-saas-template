import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformWebhookJobsSnapshot, retryWebhookDeadLetter } from "@/lib/billing/store";
import { recordPlatformAppError } from "@/lib/platform/errors";

type RetryWebhookRequest = {
  deadLetterId?: string;
  reason?: string;
};

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessPlatformAdminArea(session)) {
    return NextResponse.json({ error: "Only platform admins can retry webhook deliveries." }, { status: 403 });
  }

  let body: RetryWebhookRequest;
  try {
    body = (await request.json()) as RetryWebhookRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const deadLetterId = body.deadLetterId?.trim();
  if (!deadLetterId) {
    return NextResponse.json({ error: "A dead-letter ID is required." }, { status: 400 });
  }
  const reason = body.reason?.trim();
  if (!reason || reason.length < 8 || reason.length > 240) {
    return NextResponse.json(
      { error: "Enter a retry reason between 8 and 240 characters." },
      { status: 400 }
    );
  }

  try {
    const result = await retryWebhookDeadLetter(deadLetterId);
    await recordTenantAuditEventForSession(session, {
      tenantId: result.tenantId,
      action: "platform.webhook.retry",
      origin: "platform",
      summary: `Platform retried webhook ${result.eventId}.`,
      targetType: "webhook_delivery",
      targetId: result.eventId,
      targetLabel: result.eventType,
      metadata: {
        reason,
        deadLetterId,
        tenantId: result.tenantId,
        eventType: result.eventType,
        failureReason: result.failureReason
      }
    });
    const snapshot = await loadPlatformWebhookJobsSnapshot();
    return NextResponse.json(
      {
        eventId: result.eventId,
        tenantId: result.tenantId,
        snapshot
      },
      { status: 200 }
    );
  } catch (error) {
    await recordPlatformAppError({
      source: "platform.webhook-retry",
      route: "/api/platform/webhooks/retry",
      message: error instanceof Error ? error.message : "Could not retry webhook delivery.",
      metadata: {
        actorEmail: session.email,
        deadLetterId,
        reason
      }
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not retry webhook delivery." },
      { status: 400 }
    );
  }
}
