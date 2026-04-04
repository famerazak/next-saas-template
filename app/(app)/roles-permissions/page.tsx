import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { RolesPermissionsMatrix } from "@/components/roles-permissions-matrix";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function RolesPermissionsPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  if (!canAccessTenantAdminArea(session)) {
    return <NoAccessCard areaName="roles and permissions" />;
  }

  return <RolesPermissionsMatrix />;
}
