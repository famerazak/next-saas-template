import { NextResponse } from "next/server";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { updatePlatformSystemSettings, type PlatformGlobalFlags, type PlatformSystemDefaults } from "@/lib/platform/settings";

type PlatformSystemSettingsRequest = {
  globalFlags?: Partial<Record<keyof PlatformGlobalFlags, unknown>>;
  systemDefaults?: Partial<Record<keyof PlatformSystemDefaults, unknown>>;
};

function parseBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseInteger(value: unknown, input: { min: number; max: number }): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.round(value);
  if (normalized < input.min || normalized > input.max) {
    return null;
  }

  return normalized;
}

function parseTwoFactorDefault(value: unknown): PlatformSystemDefaults["tenantTwoFactorDefault"] | null {
  if (value === "optional" || value === "recommended") {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessPlatformAdminArea(session)) {
    return NextResponse.json({ error: "Only platform admins can manage system settings." }, { status: 403 });
  }

  let body: PlatformSystemSettingsRequest;
  try {
    body = (await request.json()) as PlatformSystemSettingsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const auditExportsEnabled = parseBoolean(body.globalFlags?.auditExportsEnabled);
  const billingSelfServeEnabled = parseBoolean(body.globalFlags?.billingSelfServeEnabled);
  const complianceExplorerEnabled = parseBoolean(body.globalFlags?.complianceExplorerEnabled);
  const auditRetentionDays = parseInteger(body.systemDefaults?.auditRetentionDays, { min: 30, max: 3650 });
  const sessionRetentionDays = parseInteger(body.systemDefaults?.sessionRetentionDays, { min: 7, max: 365 });
  const tenantTwoFactorDefault = parseTwoFactorDefault(body.systemDefaults?.tenantTwoFactorDefault);

  if (
    auditExportsEnabled === null ||
    billingSelfServeEnabled === null ||
    complianceExplorerEnabled === null ||
    auditRetentionDays === null ||
    sessionRetentionDays === null ||
    tenantTwoFactorDefault === null
  ) {
    return NextResponse.json(
      { error: "Provide valid flag values, retention ranges, and a supported tenant 2FA default." },
      { status: 400 }
    );
  }

  const snapshot = await updatePlatformSystemSettings({
    globalFlags: {
      auditExportsEnabled,
      billingSelfServeEnabled,
      complianceExplorerEnabled
    },
    systemDefaults: {
      auditRetentionDays,
      sessionRetentionDays,
      tenantTwoFactorDefault
    }
  });

  return NextResponse.json({ snapshot }, { status: 200 });
}
