import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformSettingsSnapshot, updateTenantFlagOverrides } from "@/lib/platform/settings";

type PlatformTenantFlagsRequest = {
  tenantId?: unknown;
  betaWorkspaceEnabled?: unknown;
  prioritySupportEnabled?: unknown;
  strictAuditExports?: unknown;
};

function parseBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessPlatformAdminArea(session)) {
    return NextResponse.json({ error: "Only platform admins can manage tenant feature flags." }, { status: 403 });
  }

  let body: PlatformTenantFlagsRequest;
  try {
    body = (await request.json()) as PlatformTenantFlagsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const tenantId = parseText(body.tenantId);
  const betaWorkspaceEnabled = parseBoolean(body.betaWorkspaceEnabled);
  const prioritySupportEnabled = parseBoolean(body.prioritySupportEnabled);
  const strictAuditExports = parseBoolean(body.strictAuditExports);

  if (
    !tenantId ||
    betaWorkspaceEnabled === null ||
    prioritySupportEnabled === null ||
    strictAuditExports === null
  ) {
    return NextResponse.json({ error: "Tenant and tenant flag values are required." }, { status: 400 });
  }

  const existingSnapshot = await loadPlatformSettingsSnapshot();
  const tenant = existingSnapshot.tenants.find((entry) => entry.tenantId === tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found in platform settings." }, { status: 404 });
  }

  const snapshot = await updateTenantFlagOverrides(tenantId, {
    betaWorkspaceEnabled,
    prioritySupportEnabled,
    strictAuditExports
  });

  await recordTenantAuditEventForSession(session, {
    tenantId,
    action: "platform.flags.updated",
    origin: "platform",
    summary: `Platform updated tenant flags for ${tenant.tenantName}.`,
    targetType: "tenant_flags",
    targetId: tenantId,
    targetLabel: tenant.tenantName,
    metadata: {
      betaWorkspaceEnabled,
      prioritySupportEnabled,
      strictAuditExports,
      tenantId
    }
  });

  return NextResponse.json({ snapshot }, { status: 200 });
}
