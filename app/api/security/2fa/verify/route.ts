import { NextResponse } from "next/server";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { completeTwoFactorEnrollmentForUser } from "@/lib/security/two-factor";

type VerifyRequest = {
  token?: string;
};

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to manage 2FA." }, { status: 401 });
  }

  let body: VerifyRequest;
  try {
    body = (await request.json()) as VerifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  if (!/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: "Enter the latest 6-digit code from your authenticator app." }, { status: 400 });
  }

  try {
    const twoFactor = await completeTwoFactorEnrollmentForUser(session.userId, session.email, token);
    return NextResponse.json({ twoFactor }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not verify the authenticator code."
      },
      { status: 400 }
    );
  }
}
