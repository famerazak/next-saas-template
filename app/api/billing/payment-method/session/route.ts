import { NextResponse } from "next/server";
import { canManageTenantBilling } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { startPaymentMethodSetupForSession } from "@/lib/billing/store";

export async function POST() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canManageTenantBilling(session)) {
    return NextResponse.json({ error: "Only the tenant owner can manage billing." }, { status: 403 });
  }

  try {
    const started = await startPaymentMethodSetupForSession(session);
    return NextResponse.json(
      {
        setup: started.setup,
        persistence: started.persistedToDatabase ? "database" : "local"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment method setup." },
      { status: 400 }
    );
  }
}
