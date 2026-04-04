import { NextResponse } from "next/server";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { startTwoFactorEnrollmentForUser } from "@/lib/security/two-factor";

export async function POST() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to manage 2FA." }, { status: 401 });
  }

  const twoFactor = await startTwoFactorEnrollmentForUser(session.userId, session.email);
  return NextResponse.json({ twoFactor }, { status: 200 });
}
