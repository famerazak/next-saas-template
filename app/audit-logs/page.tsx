import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function AuditLogsPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (!canAccessTenantAdminArea(session)) {
    return <NoAccessCard areaName="audit logs" />;
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Audit Logs</h1>
        <p className="auth-subtitle">Tenant audit activity and export area.</p>
      </section>
    </main>
  );
}
