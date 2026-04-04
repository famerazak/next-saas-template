import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { createInviteForSession, type InvitableRole } from "@/lib/team/invites";

type InviteMemberRequest = {
  email?: string;
  role?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = value.trim().toLowerCase();
  if (!parsed || parsed.length > 160 || !EMAIL_PATTERN.test(parsed)) {
    return null;
  }

  return parsed;
}

function parseRole(value: unknown): InvitableRole | null {
  if (typeof value !== "string") {
    return null;
  }

  switch (value.toLowerCase()) {
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    case "viewer":
      return "Viewer";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessTenantAdminArea(session)) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  let body: InviteMemberRequest;
  try {
    body = (await request.json()) as InviteMemberRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = parseEmail(body.email);
  const role = parseRole(body.role);
  if (!email || !role) {
    return NextResponse.json(
      { error: "Invite email and role are required. Role must be Admin, Member, or Viewer." },
      { status: 400 }
    );
  }

  try {
    const created = await createInviteForSession(session, { email, role });
    await recordTenantAuditEventForSession(session, {
      action: "team.invite.created",
      summary: `Invited ${created.invite.email} as ${created.invite.role}.`,
      targetType: "invite",
      targetId: created.invite.id,
      targetLabel: created.invite.email,
      metadata: {
        invitedEmail: created.invite.email,
        invitedRole: created.invite.role
      }
    });
    return NextResponse.json(
      {
        invite: created.invite,
        persistence: created.persistedToDatabase ? "database" : "local"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create invite." },
      { status: 400 }
    );
  }
}
