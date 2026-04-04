import { NextResponse } from "next/server";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { revokeUserSession } from "@/lib/auth/session-registry";

type RevokeSessionRequest = {
  sessionId?: string;
};

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to manage sessions." }, { status: 401 });
  }

  let body: RevokeSessionRequest;
  try {
    body = (await request.json()) as RevokeSessionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const targetSessionId = body.sessionId?.trim();
  if (!targetSessionId) {
    return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
  }

  if (session.sessionId && targetSessionId === session.sessionId) {
    return NextResponse.json({ error: "Use log out to end your current session." }, { status: 400 });
  }

  const revoked = await revokeUserSession(session.userId, targetSessionId);
  if (!revoked) {
    return NextResponse.json({ error: "Session not found or already revoked." }, { status: 404 });
  }

  return NextResponse.json({ revokedSessionId: revoked.sessionId }, { status: 200 });
}
