import { loadPlatformDashboardSnapshot } from "@/lib/platform/dashboard";

export type PlatformGlobalFlags = {
  auditExportsEnabled: boolean;
  billingSelfServeEnabled: boolean;
  complianceExplorerEnabled: boolean;
};

export type PlatformSystemDefaults = {
  auditRetentionDays: number;
  sessionRetentionDays: number;
  tenantTwoFactorDefault: "optional" | "recommended";
};

export type TenantFlagOverrides = {
  betaWorkspaceEnabled: boolean;
  prioritySupportEnabled: boolean;
  strictAuditExports: boolean;
};

export type PlatformSettingsTenantRecord = {
  tenantId: string;
  tenantName: string;
  ownerEmail: string;
  overrides: TenantFlagOverrides;
};

export type PlatformSettingsSnapshot = {
  globalFlags: PlatformGlobalFlags;
  systemDefaults: PlatformSystemDefaults;
  tenants: PlatformSettingsTenantRecord[];
};

type LocalPlatformSettingsState = {
  globalFlags: PlatformGlobalFlags;
  systemDefaults: PlatformSystemDefaults;
  tenantOverrides: Map<string, TenantFlagOverrides>;
};

declare global {
  // eslint-disable-next-line no-var
  var __localPlatformSettingsState: LocalPlatformSettingsState | undefined;
}

const DEFAULT_GLOBAL_FLAGS: PlatformGlobalFlags = {
  auditExportsEnabled: true,
  billingSelfServeEnabled: true,
  complianceExplorerEnabled: true
};

const DEFAULT_SYSTEM_DEFAULTS: PlatformSystemDefaults = {
  auditRetentionDays: 365,
  sessionRetentionDays: 90,
  tenantTwoFactorDefault: "optional"
};

const DEFAULT_TENANT_OVERRIDES: TenantFlagOverrides = {
  betaWorkspaceEnabled: false,
  prioritySupportEnabled: false,
  strictAuditExports: false
};

function getLocalState(): LocalPlatformSettingsState {
  if (!globalThis.__localPlatformSettingsState) {
    globalThis.__localPlatformSettingsState = {
      globalFlags: { ...DEFAULT_GLOBAL_FLAGS },
      systemDefaults: { ...DEFAULT_SYSTEM_DEFAULTS },
      tenantOverrides: new Map<string, TenantFlagOverrides>()
    };
  }

  return globalThis.__localPlatformSettingsState;
}

function tenantOverridesFor(tenantId: string): TenantFlagOverrides {
  return getLocalState().tenantOverrides.get(tenantId) ?? { ...DEFAULT_TENANT_OVERRIDES };
}

export async function loadPlatformSettingsSnapshot(): Promise<PlatformSettingsSnapshot> {
  const dashboard = await loadPlatformDashboardSnapshot();
  const state = getLocalState();

  return {
    globalFlags: { ...state.globalFlags },
    systemDefaults: { ...state.systemDefaults },
    tenants: dashboard.tenants
      .map((tenant) => ({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        ownerEmail: tenant.ownerEmail,
        overrides: tenantOverridesFor(tenant.tenantId)
      }))
      .sort((left, right) => left.tenantName.localeCompare(right.tenantName))
  };
}

export async function updatePlatformSystemSettings(input: {
  globalFlags: PlatformGlobalFlags;
  systemDefaults: PlatformSystemDefaults;
}): Promise<PlatformSettingsSnapshot> {
  const state = getLocalState();
  state.globalFlags = { ...input.globalFlags };
  state.systemDefaults = { ...input.systemDefaults };
  return loadPlatformSettingsSnapshot();
}

export async function updateTenantFlagOverrides(
  tenantId: string,
  overrides: TenantFlagOverrides
): Promise<PlatformSettingsSnapshot> {
  const state = getLocalState();
  state.tenantOverrides.set(tenantId, { ...overrides });
  return loadPlatformSettingsSnapshot();
}
