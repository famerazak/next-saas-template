import { NextResponse } from "next/server";
import { canManageTenantBilling } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { startBillingCheckoutForSession, type BillingPlanId } from "@/lib/billing/store";

type StartBillingCheckoutRequest = {
  selectedPlanId?: string;
  seatCount?: number;
};

function parsePlanId(value: unknown): BillingPlanId | null {
  if (typeof value !== "string") {
    return null;
  }

  switch (value.toLowerCase()) {
    case "starter":
      return "starter";
    case "growth":
      return "growth";
    default:
      return null;
  }
}

function parseSeatCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  if (value < 1 || value > 250) {
    return null;
  }

  return value;
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canManageTenantBilling(session)) {
    return NextResponse.json({ error: "Only the tenant owner can manage billing." }, { status: 403 });
  }

  let body: StartBillingCheckoutRequest;
  try {
    body = (await request.json()) as StartBillingCheckoutRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const selectedPlanId = parsePlanId(body.selectedPlanId);
  const seatCount = parseSeatCount(body.seatCount);
  if (!selectedPlanId || !seatCount) {
    return NextResponse.json(
      { error: "A valid plan and seat count are required to start checkout." },
      { status: 400 }
    );
  }

  try {
    const started = await startBillingCheckoutForSession(session, { selectedPlanId, seatCount });
    return NextResponse.json(
      {
        checkout: started.checkout,
        persistence: started.persistedToDatabase ? "database" : "local"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start billing checkout." },
      { status: 400 }
    );
  }
}
