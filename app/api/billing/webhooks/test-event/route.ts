import { NextResponse } from "next/server";
import { canManageTenantBilling } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadBillingSnapshotForSession, simulateStripeWebhookForSession } from "@/lib/billing/store";
import { loadTeamMembersForSession } from "@/lib/team/store";

type TestWebhookRequest = {
  eventType?: "checkout.session.completed" | "invoice.paid" | "replay-last";
};

function parseEventType(value: unknown): TestWebhookRequest["eventType"] | null {
  if (
    value === "checkout.session.completed" ||
    value === "invoice.paid" ||
    value === "replay-last"
  ) {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canManageTenantBilling(session)) {
    return NextResponse.json({ error: "Only the tenant owner can test billing webhooks." }, { status: 403 });
  }

  let body: TestWebhookRequest;
  try {
    body = (await request.json()) as TestWebhookRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const eventType = parseEventType(body.eventType);
  if (!eventType) {
    return NextResponse.json({ error: "A valid test webhook event type is required." }, { status: 400 });
  }

  try {
    const result = await simulateStripeWebhookForSession(session, { eventType });
    const members = await loadTeamMembersForSession(session);
    const snapshot = await loadBillingSnapshotForSession(session, {
      recommendedSeatCount: members.length
    });

    return NextResponse.json(
      {
        deliveryStatus: result.deliveryStatus,
        eventId: result.eventId,
        snapshot
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not simulate webhook delivery." },
      { status: 400 }
    );
  }
}
