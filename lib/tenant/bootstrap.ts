import { createClient } from "@supabase/supabase-js";

type BootstrapInput = {
  userId: string;
  email: string;
  supabaseUrl: string;
  serviceRoleKey: string;
};

export type BootstrapResult = {
  tenantId: string;
  tenantName: string;
  role: "Owner";
};

function defaultTenantName(email: string): string {
  const localPart = email.split("@")[0] ?? "new";
  const sanitized = localPart.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const title = sanitized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return `${title || "New"} Workspace`;
}

export async function bootstrapTenantForUser(input: BootstrapInput): Promise<BootstrapResult> {
  const supabase = createClient(input.supabaseUrl, input.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const tenantName = defaultTenantName(input.email);
  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: tenantName
    })
    .select("id,name")
    .single();

  if (tenantError) {
    throw new Error(`Tenant creation failed: ${tenantError.message}`);
  }

  const { error: membershipError } = await supabase.from("memberships").insert({
    tenant_id: tenantRow.id,
    user_id: input.userId,
    role: "owner"
  });

  if (membershipError) {
    throw new Error(`Membership creation failed: ${membershipError.message}`);
  }

  return {
    tenantId: tenantRow.id,
    tenantName: tenantRow.name,
    role: "Owner"
  };
}
