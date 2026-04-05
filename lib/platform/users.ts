import { createClient } from "@supabase/supabase-js";
import { loadPlatformTenantMembershipsFromLocalStore } from "@/lib/team/store";

type MembershipRow = {
  tenant_id: string;
  user_id: string;
  role: string;
};

type TenantRow = {
  id: string;
  name: string;
};

export type PlatformUserMembership = {
  tenantId: string;
  tenantName: string;
  role: string;
  status: "Active";
};

export type PlatformUserRecord = {
  userId: string;
  email: string;
  fullName: string;
  memberships: PlatformUserMembership[];
};

export type PlatformUsersSnapshot = {
  userCount: number;
  membershipCount: number;
  users: PlatformUserRecord[];
};

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || process.env.E2E_AUTH_BYPASS === "1") {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function normalizeRole(value: string | null | undefined) {
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

function fallbackFullName(email: string, explicitFullName: string) {
  if (explicitFullName.trim()) {
    return explicitFullName.trim();
  }

  const localPart = email.split("@")[0] || email;
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function buildSnapshot(users: PlatformUserRecord[]) {
  return {
    userCount: users.length,
    membershipCount: users.reduce((total, user) => total + user.memberships.length, 0),
    users
  } satisfies PlatformUsersSnapshot;
}

function buildSnapshotFromLocalStore(): PlatformUsersSnapshot {
  const grouped = new Map<string, PlatformUserRecord>();

  for (const tenant of loadPlatformTenantMembershipsFromLocalStore()) {
    for (const member of tenant.members) {
      const existing = grouped.get(member.id);
      const membership: PlatformUserMembership = {
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        role: member.role,
        status: "Active"
      };

      if (existing) {
        existing.memberships.push(membership);
        continue;
      }

      grouped.set(member.id, {
        userId: member.id,
        email: member.email,
        fullName: fallbackFullName(member.email, member.fullName),
        memberships: [membership]
      });
    }
  }

  const users = [...grouped.values()]
    .map((user) => ({
      ...user,
      memberships: user.memberships.sort((left, right) => left.tenantName.localeCompare(right.tenantName))
    }))
    .sort((left, right) => left.email.localeCompare(right.email));

  return buildSnapshot(users);
}

export async function loadPlatformUsersSnapshot(): Promise<PlatformUsersSnapshot> {
  const supabase = getServiceClient();
  if (!supabase) {
    return buildSnapshotFromLocalStore();
  }

  const [{ data: memberships, error: membershipsError }, { data: tenants, error: tenantsError }] = await Promise.all([
    supabase.from("memberships").select("tenant_id, user_id, role").returns<MembershipRow[]>(),
    supabase.from("tenants").select("id, name").returns<TenantRow[]>()
  ]);

  if (membershipsError || tenantsError || !memberships || !tenants) {
    return buildSnapshotFromLocalStore();
  }

  const tenantNames = new Map(tenants.map((tenant) => [tenant.id, tenant.name || tenant.id]));
  const uniqueUserIds = [...new Set(memberships.map((membership) => membership.user_id))];
  const usersById = new Map<string, { email: string; fullName: string }>();

  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      try {
        const result = await supabase.auth.admin.getUserById(userId);
        const email = result.data.user?.email || userId;
        const fullName = ((result.data.user?.user_metadata?.full_name as string | undefined) ?? "").trim();
        usersById.set(userId, {
          email,
          fullName: fallbackFullName(email, fullName)
        });
      } catch {
        usersById.set(userId, {
          email: userId,
          fullName: fallbackFullName(userId, "")
        });
      }
    })
  );

  const grouped = new Map<string, PlatformUserRecord>();
  for (const membership of memberships) {
    const resolvedUser = usersById.get(membership.user_id) ?? {
      email: membership.user_id,
      fullName: fallbackFullName(membership.user_id, "")
    };
    const existing = grouped.get(membership.user_id);
    const nextMembership: PlatformUserMembership = {
      tenantId: membership.tenant_id,
      tenantName: tenantNames.get(membership.tenant_id) ?? membership.tenant_id,
      role: normalizeRole(membership.role),
      status: "Active"
    };

    if (existing) {
      existing.memberships.push(nextMembership);
      continue;
    }

    grouped.set(membership.user_id, {
      userId: membership.user_id,
      email: resolvedUser.email,
      fullName: resolvedUser.fullName,
      memberships: [nextMembership]
    });
  }

  const users = [...grouped.values()]
    .map((user) => ({
      ...user,
      memberships: user.memberships.sort((left, right) => left.tenantName.localeCompare(right.tenantName))
    }))
    .sort((left, right) => left.email.localeCompare(right.email));

  return buildSnapshot(users);
}
