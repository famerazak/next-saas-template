import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { type EditableTeamRole, updateTenantMemberRoleForPlatformAdmin } from "@/lib/team/store";

type PlatformUpdateMemberRoleRequest = {
  tenantId?: string;
  targetUserId?: string;
  role?: string;
  reason?: string;
};

function parseText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseRole(value: unknown): EditableTeamRole | null {
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

  if (!canAccessPlatformAdminArea(session)) {
    return NextResponse.json({ error: "Only platform admins can change tenant roles." }, { status: 403 });
  }

  let body: PlatformUpdateMemberRoleRequest;
  try {
    body = (await request.json()) as PlatformUpdateMemberRoleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const tenantId = parseText(body.tenantId);
  const targetUserId = parseText(body.targetUserId);
  const role = parseRole(body.role);
  const reason = parseText(body.reason);

  if (!tenantId || !targetUserId || !role) {
    return NextResponse.json(
      { error: "Tenant, target user, and role are required. Role must be Admin, Member, or Viewer." },
      { status: 400 }
    );
  }

  if (!reason || reason.length < 8 || reason.length > 240) {
    return NextResponse.json(
      { error: "Enter an operator reason between 8 and 240 characters." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateTenantMemberRoleForPlatformAdmin(tenantId, targetUserId, role);
    await recordTenantAuditEventForSession(session, {
      tenantId,
      action: "platform.member.role_changed",
      origin: "platform",
      summary: `Platform changed ${updated.member.email} to ${updated.member.role}.`,
      targetType: "member",
      targetId: updated.member.id,
      targetLabel: updated.member.email,
      metadata: {
        reason,
        previousRole: updated.previousRole,
        nextRole: updated.member.role,
        tenantId
      }
    });

    return NextResponse.json(
      {
        member: updated.member,
        previousRole: updated.previousRole,
        persistence: updated.persistedToDatabase ? "database" : "local"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update tenant member role." },
      { status: 400 }
    );
  }
}
