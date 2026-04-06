import type { AppSession } from "@/lib/auth/session";

const TENANT_ADMIN_ROLES = new Set(["Owner", "Admin"]);

export function canAccessTenantAdminArea(session: AppSession): boolean {
  return TENANT_ADMIN_ROLES.has(session.role ?? "Member");
}

export function canManageTenantBilling(session: AppSession): boolean {
  return (session.role ?? "Member") === "Owner";
}

export function canTransferTenantOwnership(session: AppSession): boolean {
  return (session.role ?? "Member") === "Owner";
}

export function canWriteCoreApp(session: AppSession): boolean {
  return TENANT_ADMIN_ROLES.has(session.role ?? "Member");
}

export function canUploadTenantFiles(session: AppSession): boolean {
  return (session.role ?? "Member") !== "Viewer";
}

export function canAccessPlatformAdminArea(session: AppSession): boolean {
  return session.isPlatformAdmin === true;
}
