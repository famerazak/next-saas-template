import { createClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/session";
import type { TenantRole } from "@/lib/tenant/context";

export type TenantSettings = {
  tenantId: string;
  tenantName: string;
  role: TenantRole;
  updatedAt?: string | null;
};

type TenantRow = {
  name: string;
  updated_at: string | null;
};

type TenantUpdateResult = {
  settings: TenantSettings;
  persistedToDatabase: boolean;
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

function normalizeSession(session: AppSession): TenantSettings {
  return {
    tenantId: session.tenantId ?? "",
    tenantName: session.tenantName ?? "",
    role: session.role ?? "Member",
    updatedAt: null
  };
}

export function canAccessTenantSettings(session: AppSession): boolean {
  return session.role === "Owner" || session.role === "Admin";
}

export async function loadTenantSettingsForSession(session: AppSession): Promise<TenantSettings> {
  const base = normalizeSession(session);
  const supabase = getServiceClient();
  if (!supabase || !base.tenantId) {
    return base;
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("name, updated_at")
    .eq("id", base.tenantId)
    .maybeSingle<TenantRow>();

  if (error || !data) {
    return base;
  }

  return {
    ...base,
    tenantName: data.name || base.tenantName,
    updatedAt: data.updated_at
  };
}

export async function saveTenantNameForSession(
  session: AppSession,
  tenantName: string
): Promise<TenantUpdateResult> {
  const base = normalizeSession(session);
  const nextSettings: TenantSettings = {
    ...base,
    tenantName,
    updatedAt: new Date().toISOString()
  };

  const supabase = getServiceClient();
  if (!supabase || !base.tenantId) {
    return {
      settings: nextSettings,
      persistedToDatabase: false
    };
  }

  const { data, error } = await supabase
    .from("tenants")
    .update({
      name: tenantName,
      updated_at: nextSettings.updatedAt
    })
    .eq("id", base.tenantId)
    .select("name, updated_at")
    .maybeSingle<TenantRow>();

  if (error || !data) {
    return {
      settings: nextSettings,
      persistedToDatabase: false
    };
  }

  return {
    settings: {
      ...base,
      tenantName: data.name || tenantName,
      updatedAt: data.updated_at
    },
    persistedToDatabase: true
  };
}
