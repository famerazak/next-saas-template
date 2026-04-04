import { NextResponse } from "next/server";
import {
  clearPreAuthChallenge,
  getPreAuthChallengeFromCookies,
  setAppSession
} from "@/lib/auth/session";
import { buildRedirectUrl } from "@/lib/http/redirect";
import { verifyTwoFactorChallengeForUser } from "@/lib/security/two-factor";

type VerifyRequest = {
  token?: string;
};

function redirectToLoginWithError(request: Request, message: string) {
  const url = buildRedirectUrl(request, "/login");
  url.searchParams.set("twoFactorError", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const challenge = await getPreAuthChallengeFromCookies();
  if (!challenge) {
    return NextResponse.redirect(buildRedirectUrl(request, "/login"), { status: 303 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let token = "";

  if (contentType.includes("application/json")) {
    let body: VerifyRequest;
    try {
      body = (await request.json()) as VerifyRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    token = body.token?.trim() ?? "";
  } else {
    const formData = await request.formData();
    token = String(formData.get("token") ?? "").trim();
  }

  if (!/^\d{6}$/.test(token)) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "Enter the latest 6-digit code from your authenticator app." }, { status: 400 });
    }
    return redirectToLoginWithError(request, "Enter the latest 6-digit code from your authenticator app.");
  }

  try {
    await verifyTwoFactorChallengeForUser(challenge.userId, challenge.email, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify the authenticator code.";
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return redirectToLoginWithError(request, message);
  }

  const response = contentType.includes("application/json")
    ? NextResponse.json({ redirectTo: "/dashboard" }, { status: 200 })
    : NextResponse.redirect(buildRedirectUrl(request, "/dashboard"), { status: 303 });
  clearPreAuthChallenge(response);
  setAppSession(response, {
    userId: challenge.userId,
    email: challenge.email,
    tenantId: challenge.tenantId,
    tenantName: challenge.tenantName,
    role: challenge.role,
    fullName: challenge.fullName,
    jobTitle: challenge.jobTitle
  });
  return response;
}
