import { createClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/session";
import { saveLocalTeamMember } from "@/lib/team/store";
import type { TenantRole } from "@/lib/tenant/context";

export type InvitableRole = "Admin" | "Member" | "Viewer";

export type PendingInvite = {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  role: InvitableRole;
  status: "Pending";
  createdAt: string;
};

type PendingInviteRow = {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

type CreateInviteInput = {
  email: string;
  role: InvitableRole;
};

type InviteCreateResult = {
  invite: PendingInvite;
  persistedToDatabase: boolean;
};

type AcceptInviteResult = {
  invite: PendingInvite;
  tenantContext: {
    tenantId: string;
    tenantName: string;
    role: TenantRole;
  };
  persistedToDatabase: boolean;
};

type InviteStore = Map<string, PendingInvite[]>;

type TenantNameRow = {
  id: string;
  name: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __teamInviteStore: InviteStore | undefined;
}

function getMemoryStore(): InviteStore {
  if (!globalThis.__teamInviteStore) {
    globalThis.__teamInviteStore = new Map<string, PendingInvite[]>();
  }
  return globalThis.__teamInviteStore;
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRole(value: string | null | undefined): InvitableRole {
  switch ((value || "").toLowerCase()) {
    case "admin":
      return "Admin";
    case "viewer":
      return "Viewer";
    default:
      return "Member";
  }
}

function normalizePendingInvite(row: PendingInviteRow): PendingInvite {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: "Workspace",
    email: normalizeEmail(row.email),
    role: normalizeRole(row.role),
    status: "Pending",
    createdAt: row.created_at
  };
}

function withTenantName(invite: PendingInvite, tenantName: string): PendingInvite {
  return {
    ...invite,
    tenantName: tenantName || "Workspace"
  };
}

async function resolveTenantNames(tenantIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const supabase = getServiceClient();
  if (!supabase || tenantIds.length === 0) {
    return names;
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds)
    .returns<TenantNameRow[]>();

  if (error || !data) {
    return names;
  }

  for (const tenant of data) {
    names.set(tenant.id, tenant.name || "Workspace");
  }
  return names;
}

function loadFromMemory(session: AppSession): PendingInvite[] {
  if (!session.tenantId) {
    return [];
  }

  return [...(getMemoryStore().get(session.tenantId) ?? [])].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

function loadInvitesForEmailFromMemory(email: string): PendingInvite[] {
  const normalizedEmail = normalizeEmail(email);
  return [...getMemoryStore().values()]
    .flat()
    .filter((invite) => invite.email === normalizedEmail)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function removeInviteFromMemory(inviteId: string) {
  const store = getMemoryStore();
  for (const [tenantId, invites] of store.entries()) {
    const next = invites.filter((invite) => invite.id !== inviteId);
    if (next.length !== invites.length) {
      if (next.length === 0) {
        store.delete(tenantId);
      } else {
        store.set(tenantId, next);
      }
      return;
    }
  }
}

function saveToMemory(session: AppSession, input: CreateInviteInput): InviteCreateResult {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const email = normalizeEmail(input.email);
  const existing = loadFromMemory(session);
  if (existing.some((invite) => invite.email === email)) {
    throw new Error("A pending invite already exists for that email.");
  }

  const invite: PendingInvite = {
    id: `invite-${session.tenantId}-${email}`,
    tenantId: session.tenantId,
    tenantName: session.tenantName ?? "Workspace",
    email,
    role: input.role,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  getMemoryStore().set(session.tenantId, [invite, ...existing]);

  return {
    invite,
    persistedToDatabase: false
  };
}

export async function loadPendingInvitesForSession(session: AppSession): Promise<PendingInvite[]> {
  if (!session.tenantId) {
    return [];
  }

  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    return loadFromMemory(session);
  }

  const { data, error } = await supabase
    .from("tenant_invites")
    .select("id, tenant_id, email, role, status, created_at")
    .eq("tenant_id", session.tenantId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<PendingInviteRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map((row) => withTenantName(normalizePendingInvite(row), session.tenantName ?? "Workspace"));
}

export async function loadPendingInvitesForEmail(email: string): Promise<PendingInvite[]> {
  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    return loadInvitesForEmailFromMemory(email);
  }

  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase
    .from("tenant_invites")
    .select("id, tenant_id, email, role, status, created_at")
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<PendingInviteRow[]>();

  if (error || !data) {
    return [];
  }

  const tenantNames = await resolveTenantNames([...new Set(data.map((invite) => invite.tenant_id))]);
  return data.map((row) =>
    withTenantName(normalizePendingInvite(row), tenantNames.get(row.tenant_id) ?? "Workspace")
  );
}

export async function createInviteForSession(
  session: AppSession,
  input: CreateInviteInput
): Promise<InviteCreateResult> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const email = normalizeEmail(input.email);
  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    return saveToMemory(session, {
      email,
      role: input.role
    });
  }

  const { data: existing, error: existingError } = await supabase
    .from("tenant_invites")
    .select("id")
    .eq("tenant_id", session.tenantId)
    .eq("email", email)
    .eq("status", "pending")
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing && existing.length > 0) {
    throw new Error("A pending invite already exists for that email.");
  }

  const createdAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("tenant_invites")
    .insert({
      tenant_id: session.tenantId,
      email,
      role: input.role.toLowerCase(),
      status: "pending",
      invited_by_user_id: session.userId,
      created_at: createdAt,
      updated_at: createdAt
    })
    .select("id, tenant_id, email, role, status, created_at")
    .maybeSingle<PendingInviteRow>();

  if (error || !data) {
    throw new Error(error?.message || "Could not create invite.");
  }

  return {
    invite: withTenantName(normalizePendingInvite(data), session.tenantName ?? "Workspace"),
    persistedToDatabase: true
  };
}

export async function acceptInviteForSession(
  session: AppSession,
  inviteId: string
): Promise<AcceptInviteResult> {
  const normalizedEmail = normalizeEmail(session.email);
  const supabase = getServiceClient();

  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    const invite = loadInvitesForEmailFromMemory(normalizedEmail).find((entry) => entry.id === inviteId);
    if (!invite) {
      throw new Error("Invite not found.");
    }

    removeInviteFromMemory(invite.id);
    saveLocalTeamMember({
      tenantId: invite.tenantId,
      tenantName: invite.tenantName,
      id: session.userId,
      email: session.email,
      fullName: session.fullName || "Current user",
      role: invite.role,
      status: "Active"
    });

    return {
      invite,
      tenantContext: {
        tenantId: invite.tenantId,
        tenantName: invite.tenantName,
        role: invite.role
      },
      persistedToDatabase: false
    };
  }

  const { data: inviteRow, error: inviteError } = await supabase
    .from("tenant_invites")
    .select("id, tenant_id, email, role, status, created_at")
    .eq("id", inviteId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle<PendingInviteRow>();

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  if (!inviteRow) {
    throw new Error("Invite not found.");
  }

  const acceptedAt = new Date().toISOString();
  const { error: membershipError } = await supabase.from("memberships").upsert(
    {
      tenant_id: inviteRow.tenant_id,
      user_id: session.userId,
      role: inviteRow.role.toLowerCase()
    },
    { onConflict: "tenant_id,user_id" }
  );

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { error: inviteUpdateError } = await supabase
    .from("tenant_invites")
    .update({
      status: "accepted",
      accepted_at: acceptedAt,
      updated_at: acceptedAt
    })
    .eq("id", inviteRow.id);

  if (inviteUpdateError) {
    throw new Error(inviteUpdateError.message);
  }

  const tenantNames = await resolveTenantNames([inviteRow.tenant_id]);
  const invite = withTenantName(
    normalizePendingInvite(inviteRow),
    tenantNames.get(inviteRow.tenant_id) ?? "Workspace"
  );

  return {
    invite,
    tenantContext: {
      tenantId: invite.tenantId,
      tenantName: invite.tenantName,
      role: invite.role
    },
    persistedToDatabase: true
  };
}
