import { createClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/session";
import type { TenantRole } from "@/lib/tenant/context";

export type TenantSettings = {
  tenantId: string;
  tenantName: string;
  dashboardNote: string;
  role: TenantRole;
  updatedAt?: string | null;
};

type TenantRow = {
  name: string;
  dashboard_note: string | null;
  updated_at: string | null;
};

type TenantUpdateResult = {
  settings: TenantSettings;
  persistedToDatabase: boolean;
};

const DEFAULT_DASHBOARD_NOTE =
  "Use this note to capture tenant-wide updates, operating context, and next steps.";

type LocalTenantSnapshot = {
  tenantName: string;
  dashboardNote: string;
  updatedAt: string | null;
};

type LocalTenantSettingsStore = Map<string, LocalTenantSnapshot>;

declare global {
  // eslint-disable-next-line no-var
  var __localTenantSettingsStore: LocalTenantSettingsStore | undefined;
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

function getLocalTenantSettingsStore(): LocalTenantSettingsStore {
  if (!globalThis.__localTenantSettingsStore) {
    globalThis.__localTenantSettingsStore = new Map<string, LocalTenantSnapshot>();
  }

  return globalThis.__localTenantSettingsStore;
}

function normalizeSession(session: AppSession): TenantSettings {
  return {
    tenantId: session.tenantId ?? "",
    tenantName: session.tenantName ?? "",
    dashboardNote: DEFAULT_DASHBOARD_NOTE,
    role: session.role ?? "Member",
    updatedAt: null
  };
}

function loadFromLocalStore(base: TenantSettings): TenantSettings {
  if (!base.tenantId) {
    return base;
  }

  const snapshot = getLocalTenantSettingsStore().get(base.tenantId);
  if (!snapshot) {
    return base;
  }

  return {
    ...base,
    tenantName: snapshot.tenantName || base.tenantName,
    dashboardNote: snapshot.dashboardNote || DEFAULT_DASHBOARD_NOTE,
    updatedAt: snapshot.updatedAt
  };
}

function saveToLocalStore(settings: TenantSettings): TenantSettings {
  if (!settings.tenantId) {
    return settings;
  }

  getLocalTenantSettingsStore().set(settings.tenantId, {
    tenantName: settings.tenantName,
    dashboardNote: settings.dashboardNote,
    updatedAt: settings.updatedAt ?? null
  });

  return settings;
}

export function canAccessTenantSettings(session: AppSession): boolean {
  return session.role === "Owner" || session.role === "Admin";
}

export async function loadTenantSettingsForSession(session: AppSession): Promise<TenantSettings> {
  const base = normalizeSession(session);
  const supabase = getServiceClient();
  if (!supabase || !base.tenantId) {
    return loadFromLocalStore(base);
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("name, dashboard_note, updated_at")
    .eq("id", base.tenantId)
    .maybeSingle<TenantRow>();

  if (error || !data) {
    return loadFromLocalStore(base);
  }

  return {
    ...base,
    tenantName: data.name || base.tenantName,
    dashboardNote: data.dashboard_note || DEFAULT_DASHBOARD_NOTE,
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
    dashboardNote: loadFromLocalStore(base).dashboardNote,
    updatedAt: new Date().toISOString()
  };

  const supabase = getServiceClient();
  if (!supabase || !base.tenantId) {
    return {
      settings: saveToLocalStore(nextSettings),
      persistedToDatabase: false
    };
  }

  const { data, error } = await supabase
    .from("tenants")
    .update({
      name: tenantName,
      dashboard_note: nextSettings.dashboardNote || null,
      updated_at: nextSettings.updatedAt
    })
    .eq("id", base.tenantId)
    .select("name, dashboard_note, updated_at")
    .maybeSingle<TenantRow>();

  if (error || !data) {
    return {
      settings: saveToLocalStore(nextSettings),
      persistedToDatabase: false
    };
  }

  return {
    settings: {
      ...base,
      tenantName: data.name || tenantName,
      dashboardNote: data.dashboard_note || nextSettings.dashboardNote || DEFAULT_DASHBOARD_NOTE,
      updatedAt: data.updated_at
    },
    persistedToDatabase: true
  };
}

export async function saveDashboardNoteForSession(
  session: AppSession,
  dashboardNote: string
): Promise<TenantUpdateResult> {
  const base = normalizeSession(session);
  const local = loadFromLocalStore(base);
  const nextSettings: TenantSettings = {
    ...local,
    tenantId: base.tenantId,
    tenantName: local.tenantName || base.tenantName,
    role: base.role,
    dashboardNote,
    updatedAt: new Date().toISOString()
  };

  const supabase = getServiceClient();
  if (!supabase || !base.tenantId) {
    return {
      settings: saveToLocalStore(nextSettings),
      persistedToDatabase: false
    };
  }

  const { data, error } = await supabase
    .from("tenants")
    .update({
      dashboard_note: dashboardNote || null,
      updated_at: nextSettings.updatedAt
    })
    .eq("id", base.tenantId)
    .select("name, dashboard_note, updated_at")
    .maybeSingle<TenantRow>();

  if (error || !data) {
    return {
      settings: saveToLocalStore(nextSettings),
      persistedToDatabase: false
    };
  }

  return {
    settings: {
      ...base,
      tenantName: data.name || nextSettings.tenantName,
      dashboardNote: data.dashboard_note || DEFAULT_DASHBOARD_NOTE,
      updatedAt: data.updated_at
    },
    persistedToDatabase: true
  };
}
