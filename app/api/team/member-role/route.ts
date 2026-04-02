import { NextResponse } from "next/server";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { updateMemberRoleForSession } from "@/lib/team/store";
import type { TenantRole } from "@/lib/tenant/context";

type UpdateRoleRequest = {
  userId?: string;
  role?: string;
};

function parseRole(value: unknown): Extract<TenantRole, "Admin" | "Member" | "Viewer"> | null {
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

  let body: UpdateRoleRequest;
  try {
    body = (await request.json()) as UpdateRoleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const role = parseRole(body.role);
  if (!userId || !role) {
    return NextResponse.json(
      { error: "User ID and role are required. Role must be Admin, Member, or Viewer." },
      { status: 400 }
    );
  }

  try {
    const member = await updateMemberRoleForSession(session, userId, role);
    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update member role." },
      { status: 400 }
    );
  }
}
