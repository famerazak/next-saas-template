import type { AppSession } from "@/lib/auth/session";

const TENANT_ADMIN_ROLES = new Set(["Owner", "Admin"]);

export function canAccessTenantAdminArea(session: AppSession): boolean {
  return TENANT_ADMIN_ROLES.has(session.role ?? "Member");
}
