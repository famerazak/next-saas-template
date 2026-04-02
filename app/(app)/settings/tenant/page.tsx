import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { TenantSettingsForm } from "@/components/tenant-settings-form";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadTenantSettingsForSession } from "@/lib/tenant/settings";

export default async function TenantSettingsPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (!canAccessTenantAdminArea(session)) {
    return <NoAccessCard areaName="tenant settings" />;
  }

  const settings = await loadTenantSettingsForSession(session);

  return (
    <TenantSettingsForm
      initialTenantName={settings.tenantName || "Workspace"}
      tenantRole={settings.role}
      tenantId={settings.tenantId}
    />
  );
}
