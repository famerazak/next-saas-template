import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canTransferTenantOwnership } from "@/lib/auth/authorization";
import { getAppSessionFromCookies, setAppSession } from "@/lib/auth/session";
import { transferTeamOwnershipForSession } from "@/lib/team/store";

type OwnershipTransferRequest = {
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

  if (!canTransferTenantOwnership(session)) {
    return NextResponse.json({ error: "Only the current owner can transfer ownership." }, { status: 403 });
  }

  let body: OwnershipTransferRequest;
  try {
    body = (await request.json()) as OwnershipTransferRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const targetUserId = parseTargetUserId(body.targetUserId);
  if (!targetUserId) {
    return NextResponse.json({ error: "Target user is required." }, { status: 400 });
  }

  try {
    const transferred = await transferTeamOwnershipForSession(session, targetUserId);
    await recordTenantAuditEventForSession(session, {
      action: "team.ownership.transferred",
      summary: `Transferred tenant ownership to ${transferred.nextOwner.email}.`,
      targetType: "member",
      targetId: transferred.nextOwner.id,
      targetLabel: transferred.nextOwner.email,
      metadata: {
        previousOwnerEmail: transferred.previousOwner.email,
        nextOwnerEmail: transferred.nextOwner.email
      }
    });
    const response = NextResponse.json(
      {
        nextOwner: transferred.nextOwner,
        previousOwner: transferred.previousOwner,
        persistence: transferred.persistedToDatabase ? "database+session" : "local+session"
      },
      { status: 200 }
    );

    setAppSession(response, {
      ...session,
      role: transferred.previousOwner.role
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not transfer ownership." },
      { status: 400 }
    );
  }
}
