import { NextResponse } from "next/server";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { removeTeamMemberForSession } from "@/lib/team/store";

type RemoveMemberRequest = {
  targetUserId?: string;
};

function parseTargetUserId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessTenantAdminArea(session)) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  let body: RemoveMemberRequest;
  try {
    body = (await request.json()) as RemoveMemberRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const targetUserId = parseTargetUserId(body.targetUserId);
  if (!targetUserId) {
    return NextResponse.json({ error: "Target user is required." }, { status: 400 });
  }

  try {
    const removed = await removeTeamMemberForSession(session, targetUserId);
    return NextResponse.json(
      {
        member: removed.member,
        persistence: removed.persistedToDatabase ? "database" : "local"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove team member." },
      { status: 400 }
    );
  }
}
