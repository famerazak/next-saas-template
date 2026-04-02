import { createClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/session";

export type InvitableRole = "Admin" | "Member" | "Viewer";

export type PendingInvite = {
  id: string;
  tenantId: string;
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

type InviteStore = Map<string, PendingInvite[]>;

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
    email: normalizeEmail(row.email),
    role: normalizeRole(row.role),
    status: "Pending",
    createdAt: row.created_at
  };
}

function loadFromMemory(session: AppSession): PendingInvite[] {
  if (!session.tenantId) {
    return [];
  }

  return [...(getMemoryStore().get(session.tenantId) ?? [])].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
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

  return data.map(normalizePendingInvite);
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
      created_at: createdAt
    })
    .select("id, tenant_id, email, role, status, created_at")
    .maybeSingle<PendingInviteRow>();

  if (error || !data) {
    throw new Error(error?.message || "Could not create invite.");
  }

  return {
    invite: normalizePendingInvite(data),
    persistedToDatabase: true
  };
}
