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

type LocalTeamMember = TeamMember & {
  tenantId: string;
};

type LocalTeamStore = Map<string, TeamMember[]>;

declare global {
  // eslint-disable-next-line no-var
  var __localTeamStore: LocalTeamStore | undefined;
}

function getLocalTeamStore(): LocalTeamStore {
  if (!globalThis.__localTeamStore) {
    globalThis.__localTeamStore = new Map<string, TeamMember[]>();
  }
  return globalThis.__localTeamStore;
}

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

export function saveLocalTeamMember(member: LocalTeamMember): TeamMember[] {
  const store = getLocalTeamStore();
  const existing = store.get(member.tenantId) ?? [];
  const next = [
    {
      id: member.id,
      email: member.email,
      fullName: member.fullName,
      role: member.role,
      status: member.status
    },
    ...existing.filter((entry) => entry.id !== member.id)
  ];
  store.set(member.tenantId, next);
  return next;
}

function loadFromLocalStore(session: AppSession): TeamMember[] {
  if (!session.tenantId) {
    return fallbackMemberFromSession(session);
  }

  return saveLocalTeamMember({
    tenantId: session.tenantId,
    id: session.userId,
    email: session.email,
    fullName: session.fullName || "Current user",
    role: session.role ?? "Member",
    status: "Active"
  });
}

export async function loadTeamMembersForSession(session: AppSession): Promise<TeamMember[]> {
  const supabase = getServiceClient();
  if (!supabase || !session.tenantId) {
    return loadFromLocalStore(session);
  }

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("tenant_id", session.tenantId)
    .order("created_at", { ascending: true })
    .returns<MembershipRow[]>();

  if (error || !memberships || memberships.length === 0) {
    return loadFromLocalStore(session);
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

export async function updateMemberRoleForSession(
  session: AppSession,
  targetUserId: string,
  nextRole: Extract<TenantRole, "Admin" | "Member" | "Viewer">
): Promise<TeamMember> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  if (targetUserId === session.userId) {
    throw new Error("You cannot change your own role.");
  }

  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    const members = loadFromLocalStore(session);
    const target = members.find((member) => member.id === targetUserId);
    if (!target) {
      throw new Error("Member not found.");
    }
    if (target.role === "Owner") {
      throw new Error("Owner role cannot be changed here.");
    }

    const updated: TeamMember = {
      ...target,
      role: nextRole
    };
    const nextMembers = members.map((member) => (member.id === targetUserId ? updated : member));
    getLocalTeamStore().set(session.tenantId, nextMembers);
    return updated;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("tenant_id", session.tenantId)
    .eq("user_id", targetUserId)
    .maybeSingle<MembershipRow>();

  if (lookupError) {
    throw new Error(lookupError.message);
  }
  if (!existing?.user_id) {
    throw new Error("Member not found.");
  }
  if (normalizeRole(existing.role) === "Owner") {
    throw new Error("Owner role cannot be changed here.");
  }

  const { error: updateError } = await supabase
    .from("memberships")
    .update({ role: nextRole.toLowerCase() })
    .eq("tenant_id", session.tenantId)
    .eq("user_id", targetUserId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  let email = targetUserId;
  let fullName = "";
  try {
    const result = await supabase.auth.admin.getUserById(targetUserId);
    email = result.data.user?.email || targetUserId;
  } catch {
    // Keep fallback values when admin lookup is unavailable.
  }

  return {
    id: targetUserId,
    email,
    fullName,
    role: nextRole,
    status: "Active"
  };
}
