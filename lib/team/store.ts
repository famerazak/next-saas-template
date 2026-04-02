import { createClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/session";
import type { TenantRole } from "@/lib/tenant/context";

export type TeamMember = {
  id: string;
  email: string;
  fullName: string;
  role: TenantRole;
  status: "Active";
};

type MembershipRow = {
  user_id: string;
  role: string;
};

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function normalizeRole(value: string | null | undefined): TenantRole {
  switch ((value || "").toLowerCase()) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "viewer":
      return "Viewer";
    default:
      return "Member";
  }
}

function fallbackMemberFromSession(session: AppSession): TeamMember[] {
  return [
    {
      id: session.userId,
      email: session.email,
      fullName: session.fullName || "Current user",
      role: session.role ?? "Member",
      status: "Active"
    }
  ];
}

export async function loadTeamMembersForSession(session: AppSession): Promise<TeamMember[]> {
  const supabase = getServiceClient();
  if (!supabase || !session.tenantId) {
    return fallbackMemberFromSession(session);
  }

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("tenant_id", session.tenantId)
    .order("created_at", { ascending: true })
    .returns<MembershipRow[]>();

  if (error || !memberships || memberships.length === 0) {
    return fallbackMemberFromSession(session);
  }

  const users = await Promise.all(
    memberships.map(async (membership) => {
      if (membership.user_id === session.userId) {
        return {
          id: membership.user_id,
          email: session.email,
          fullName: session.fullName || "Current user",
          role: normalizeRole(membership.role),
          status: "Active" as const
        };
      }

      try {
        const result = await supabase.auth.admin.getUserById(membership.user_id);
        return {
          id: membership.user_id,
          email: result.data.user?.email || membership.user_id,
          fullName: "",
          role: normalizeRole(membership.role),
          status: "Active" as const
        };
      } catch {
        return {
          id: membership.user_id,
          email: membership.user_id,
          fullName: "",
          role: normalizeRole(membership.role),
          status: "Active" as const
        };
      }
    })
  );

  return users;
}
