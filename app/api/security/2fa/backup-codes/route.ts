import { NextResponse } from "next/server";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { generateBackupCodesForUser } from "@/lib/security/two-factor";

export async function POST() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to manage backup codes." }, { status: 401 });
  }

  try {
    const { twoFactor, backupCodes } = await generateBackupCodesForUser(session.userId, session.email);
    return NextResponse.json({ twoFactor, backupCodes }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate backup codes." },
      { status: 400 }
    );
  }
}
