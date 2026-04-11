import { NextResponse } from "next/server";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { recordPlatformAppError } from "@/lib/platform/errors";

export async function POST() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessPlatformAdminArea(session)) {
    return NextResponse.json({ error: "Only platform admins can create diagnostics test errors." }, { status: 403 });
  }

  const errorRecord = await recordPlatformAppError({
    source: "platform.diagnostics.test",
    route: "/api/platform/diagnostics/test-error",
    message: "Simulated starter error for diagnostics validation.",
    severity: "error",
    metadata: {
      triggeredBy: session.email,
      synthetic: true
    }
  });

  return NextResponse.json({ errorRecord }, { status: 200 });
}
