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

export type EditableTeamRole = Exclude<TenantRole, "Owner">;

export type PlatformTenantMembersSnapshot = {
  tenantId: string;
  tenantName: string;
  members: TeamMember[];
};

type MembershipRow = {
  user_id: string;
  role: string;
};

type LocalTeamMember = TeamMember & {
  tenantId: string;
  tenantName?: string;
};

type LocalTeamStore = Map<string, TeamMember[]>;
type LocalTenantNameStore = Map<string, string>;

declare global {
  // eslint-disable-next-line no-var
  var __localTeamStore: LocalTeamStore | undefined;
  // eslint-disable-next-line no-var
  var __localTenantNameStore: LocalTenantNameStore | undefined;
}

function getLocalTeamStore(): LocalTeamStore {
  if (!globalThis.__localTeamStore) {
    globalThis.__localTeamStore = new Map<string, TeamMember[]>();
  }
  return globalThis.__localTeamStore;
}

function getLocalTenantNameStore(): LocalTenantNameStore {
  if (!globalThis.__localTenantNameStore) {
    globalThis.__localTenantNameStore = new Map<string, string>();
  }
  return globalThis.__localTenantNameStore;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
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

function normalizeEditableRole(value: string | null | undefined): EditableTeamRole {
  switch ((value || "").toLowerCase()) {
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
  const tenantNames = getLocalTenantNameStore();
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
  if (member.tenantName) {
    tenantNames.set(member.tenantId, member.tenantName);
  }
  return next;
}

export function resolveLocalTenantContextForEmail(
  email: string
): { tenantId: string; tenantName: string; role: TenantRole } | null {
  const normalizedEmail = normalizeEmail(email);
  const store = getLocalTeamStore();
  const tenantNames = getLocalTenantNameStore();

  for (const [tenantId, members] of store.entries()) {
    const match = members.find((member) => normalizeEmail(member.email) === normalizedEmail);
    if (!match) {
      continue;
    }

    return {
      tenantId,
      tenantName: tenantNames.get(tenantId) ?? "Workspace",
      role: match.role
    };
  }

  return null;
}

function loadFromLocalStore(session: AppSession): TeamMember[] {
  if (!session.tenantId) {
    return fallbackMemberFromSession(session);
  }

  return saveLocalTeamMember({
    tenantId: session.tenantId,
    tenantName: session.tenantName,
    id: session.userId,
    email: session.email,
    fullName: session.fullName || "Current user",
    role: session.role ?? "Member",
    status: "Active"
  });
}

export function loadPlatformTenantMembershipsFromLocalStore(): PlatformTenantMembersSnapshot[] {
  const store = getLocalTeamStore();
  const tenantNames = getLocalTenantNameStore();

  return [...store.entries()]
    .map(([tenantId, members]) => ({
      tenantId,
      tenantName: tenantNames.get(tenantId) ?? "Workspace",
      members
    }))
    .sort((left, right) => left.tenantName.localeCompare(right.tenantName));
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

function updateMemberRoleInLocalStore(
  session: AppSession,
  targetUserId: string,
  role: EditableTeamRole
): TeamMember {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const store = getLocalTeamStore();
  const members = loadFromLocalStore(session);
  const target = members.find((member) => member.id === targetUserId);

  if (!target) {
    throw new Error("Team member not found.");
  }

  if (target.id === session.userId) {
    throw new Error("You cannot change your own role from this screen.");
  }

  if (target.role === "Owner") {
    throw new Error("Owner role changes must use the ownership transfer flow.");
  }

  const updatedMember = { ...target, role };
  store.set(
    session.tenantId,
    members.map((member) => (member.id === targetUserId ? updatedMember : member))
  );

  return updatedMember;
}

export async function updateTeamMemberRoleForSession(
  session: AppSession,
  targetUserId: string,
  role: EditableTeamRole
): Promise<{ member: TeamMember; persistedToDatabase: boolean }> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    return {
      member: updateMemberRoleInLocalStore(session, targetUserId, role),
      persistedToDatabase: false
    };
  }

  const members = await loadTeamMembersForSession(session);
  const target = members.find((member) => member.id === targetUserId);

  if (!target) {
    throw new Error("Team member not found.");
  }

  if (target.id === session.userId) {
    throw new Error("You cannot change your own role from this screen.");
  }

  if (target.role === "Owner") {
    throw new Error("Owner role changes must use the ownership transfer flow.");
  }

  const normalizedRole = normalizeEditableRole(role);
  const { error } = await supabase
    .from("memberships")
    .update({
      role: normalizedRole.toLowerCase()
    })
    .eq("tenant_id", session.tenantId)
    .eq("user_id", targetUserId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    member: {
      ...target,
      role: normalizedRole
    },
    persistedToDatabase: true
  };
}

function removeMemberFromLocalStore(session: AppSession, targetUserId: string): TeamMember {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const store = getLocalTeamStore();
  const members = loadFromLocalStore(session);
  const target = members.find((member) => member.id === targetUserId);

  if (!target) {
    throw new Error("Team member not found.");
  }

  if (target.id === session.userId) {
    throw new Error("You cannot remove yourself from this screen.");
  }

  if (target.role === "Owner") {
    throw new Error("Owner removal must use the ownership transfer flow.");
  }

  store.set(
    session.tenantId,
    members.filter((member) => member.id !== targetUserId)
  );

  return target;
}

export async function removeTeamMemberForSession(
  session: AppSession,
  targetUserId: string
): Promise<{ member: TeamMember; persistedToDatabase: boolean }> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    return {
      member: removeMemberFromLocalStore(session, targetUserId),
      persistedToDatabase: false
    };
  }

  const members = await loadTeamMembersForSession(session);
  const target = members.find((member) => member.id === targetUserId);

  if (!target) {
    throw new Error("Team member not found.");
  }

  if (target.id === session.userId) {
    throw new Error("You cannot remove yourself from this screen.");
  }

  if (target.role === "Owner") {
    throw new Error("Owner removal must use the ownership transfer flow.");
  }

  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("tenant_id", session.tenantId)
    .eq("user_id", targetUserId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    member: target,
    persistedToDatabase: true
  };
}

function transferOwnershipInLocalStore(
  session: AppSession,
  targetUserId: string
): { nextOwner: TeamMember; previousOwner: TeamMember } {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  if ((session.role ?? "Member") !== "Owner") {
    throw new Error("Only the current owner can transfer ownership.");
  }

  const store = getLocalTeamStore();
  const members = loadFromLocalStore(session);
  const target = members.find((member) => member.id === targetUserId);
  const currentOwner = members.find((member) => member.id === session.userId);

  if (!target || !currentOwner) {
    throw new Error("Team member not found.");
  }

  if (target.id === session.userId) {
    throw new Error("Choose another eligible member.");
  }

  if (target.role === "Owner") {
    throw new Error("That member is already the owner.");
  }

  if (target.role === "Viewer") {
    throw new Error("Viewer cannot receive ownership directly.");
  }

  const nextOwner = { ...target, role: "Owner" as const };
  const previousOwner = { ...currentOwner, role: "Admin" as const };

  store.set(
    session.tenantId,
    members.map((member) => {
      if (member.id === nextOwner.id) return nextOwner;
      if (member.id === previousOwner.id) return previousOwner;
      return member;
    })
  );

  return { nextOwner, previousOwner };
}

export async function transferTeamOwnershipForSession(
  session: AppSession,
  targetUserId: string
): Promise<{
  nextOwner: TeamMember;
  previousOwner: TeamMember;
  persistedToDatabase: boolean;
}> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  if ((session.role ?? "Member") !== "Owner") {
    throw new Error("Only the current owner can transfer ownership.");
  }

  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    const local = transferOwnershipInLocalStore(session, targetUserId);
    return {
      ...local,
      persistedToDatabase: false
    };
  }

  const members = await loadTeamMembersForSession(session);
  const target = members.find((member) => member.id === targetUserId);
  const currentOwner = members.find((member) => member.id === session.userId);

  if (!target || !currentOwner) {
    throw new Error("Team member not found.");
  }

  if (target.id === session.userId) {
    throw new Error("Choose another eligible member.");
  }

  if (target.role === "Owner") {
    throw new Error("That member is already the owner.");
  }

  if (target.role === "Viewer") {
    throw new Error("Viewer cannot receive ownership directly.");
  }

  const { error: targetError } = await supabase
    .from("memberships")
    .update({ role: "owner" })
    .eq("tenant_id", session.tenantId)
    .eq("user_id", targetUserId);

  if (targetError) {
    throw new Error(targetError.message);
  }

  const { error: currentOwnerError } = await supabase
    .from("memberships")
    .update({ role: "admin" })
    .eq("tenant_id", session.tenantId)
    .eq("user_id", session.userId);

  if (currentOwnerError) {
    throw new Error(currentOwnerError.message);
  }

  return {
    nextOwner: {
      ...target,
      role: "Owner"
    },
    previousOwner: {
      ...currentOwner,
      role: "Admin"
    },
    persistedToDatabase: true
  };
}
