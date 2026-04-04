import { NextResponse } from "next/server";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { type EditableTeamRole, updateTeamMemberRoleForSession } from "@/lib/team/store";

type UpdateMemberRoleRequest = {
  targetUserId?: string;
  role?: string;
};

function parseTargetUserId(value: unknown): string | null {
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

  if (!canAccessTenantAdminArea(session)) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  let body: UpdateMemberRoleRequest;
  try {
    body = (await request.json()) as UpdateMemberRoleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const targetUserId = parseTargetUserId(body.targetUserId);
  const role = parseRole(body.role);
  if (!targetUserId || !role) {
    return NextResponse.json(
      { error: "Target user and role are required. Role must be Admin, Member, or Viewer." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateTeamMemberRoleForSession(session, targetUserId, role);
    return NextResponse.json(
      {
        member: updated.member,
        persistence: updated.persistedToDatabase ? "database" : "local"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update member role." },
      { status: 400 }
    );
  }
}
