import { createClient } from "@supabase/supabase-js";

export type TenantRole = "Owner" | "Admin" | "Member" | "Viewer";

export type TenantContext = {
  tenantId: string;
  tenantName: string;
  role: TenantRole;
};

type ResolveTenantContextInput = {
  userId: string;
  email: string;
  supabaseUrl: string;
  serviceRoleKey?: string;
};

type MembershipRow = {
  tenant_id: string;
  role: string;
};

type TenantRow = {
  name: string;
};

function toTitleCase(value: string): string {
  if (!value) return "Workspace";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toTenantRole(value: string | null | undefined): TenantRole {
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

function deriveTenantId(email: string): string {
  const tenantSlug = email
    .toLowerCase()
    .split("@")[1]
    ?.split(".")[0]
    ?.replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `tenant-${tenantSlug || "workspace"}`;
}

export function inferTenantRoleFromEmail(email: string): TenantRole {
  const local = (email.split("@")[0] || "").toLowerCase();
  if (local.includes("admin")) return "Admin";
  if (local.includes("member")) return "Member";
  if (local.includes("viewer")) return "Viewer";
  return "Owner";
}

export function deriveTenantContextFromEmail(email: string, role: TenantRole): TenantContext {
  const [, domain = "workspace.local"] = email.split("@");
  const root = domain.split(".")[0] ?? "workspace";
  return {
    tenantId: deriveTenantId(email),
    tenantName: `${toTitleCase(root)} Workspace`,
    role
  };
}

export async function resolvePrimaryTenantContextForUser(
  input: ResolveTenantContextInput
): Promise<TenantContext> {
  if (!input.serviceRoleKey) {
    return deriveTenantContextFromEmail(input.email, "Owner");
  }

  const supabase = createClient(input.supabaseUrl, input.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw new Error(`Membership lookup failed: ${membershipError.message}`);
  }

  if (!membership?.tenant_id) {
    return deriveTenantContextFromEmail(input.email, "Owner");
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", membership.tenant_id)
    .maybeSingle<TenantRow>();

  if (tenantError) {
    throw new Error(`Tenant lookup failed: ${tenantError.message}`);
  }

  return {
    tenantId: membership.tenant_id,
    tenantName: tenant?.name || deriveTenantContextFromEmail(input.email, "Owner").tenantName,
    role: toTenantRole(membership.role)
  };
}
