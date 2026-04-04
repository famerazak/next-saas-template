import { NextResponse } from "next/server";
import { revokeUserSession } from "@/lib/auth/session-registry";
import { clearAppSession, clearPreAuthChallenge } from "@/lib/auth/session";
import { buildRedirectUrl } from "@/lib/http/redirect";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  const response = NextResponse.redirect(buildRedirectUrl(request, "/login"), { status: 303 });
  if (session?.sessionId) {
    await revokeUserSession(session.userId, session.sessionId);
  }
  clearAppSession(response);
  clearPreAuthChallenge(response);
  return response;
}
