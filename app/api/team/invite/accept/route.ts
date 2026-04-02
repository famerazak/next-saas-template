import { NextResponse } from "next/server";
import { getAppSessionFromCookies, setAppSession } from "@/lib/auth/session";
import { acceptInviteForSession } from "@/lib/team/invites";

type AcceptInviteRequest = {
  inviteId?: string;
};

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: AcceptInviteRequest;
  try {
    body = (await request.json()) as AcceptInviteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.inviteId) {
    return NextResponse.json({ error: "Invite ID is required." }, { status: 400 });
  }

  try {
    const accepted = await acceptInviteForSession(session, body.inviteId);
    const response = NextResponse.json(
      {
        invite: accepted.invite,
        tenant: accepted.tenantContext,
        persistence: accepted.persistedToDatabase ? "database+session" : "local+session"
      },
      { status: 200 }
    );

    setAppSession(response, {
      ...session,
      tenantId: accepted.tenantContext.tenantId,
      tenantName: accepted.tenantContext.tenantName,
      role: accepted.tenantContext.role
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not accept invite." },
      { status: 400 }
    );
  }
}
