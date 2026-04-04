import { NextResponse } from "next/server";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformWebhookJobsSnapshot, retryWebhookDeadLetter } from "@/lib/billing/store";

type RetryWebhookRequest = {
  deadLetterId?: string;
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

  try {
    const result = await retryWebhookDeadLetter(deadLetterId);
    const snapshot = await loadPlatformWebhookJobsSnapshot();
    return NextResponse.json(
      {
        eventId: result.eventId,
        snapshot
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not retry webhook delivery." },
      { status: 400 }
    );
  }
}
