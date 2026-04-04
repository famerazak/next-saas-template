import { redirect } from "next/navigation";
import { AuditLogConsole } from "@/components/audit-log-console";
import { NoAccessCard } from "@/components/no-access-card";
import { loadTenantAuditEventsForSession } from "@/lib/audit/store";
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

  const events = await loadTenantAuditEventsForSession(session, { limit: 25 });

  return (
    <main className="page-shell">
      <section className="auth-card settings-card">
        <h1>Audit Logs</h1>
        <p className="auth-subtitle">
          Recent tenant-admin and billing actions for {session.tenantName ?? "this workspace"}.
        </p>
      </section>
      <AuditLogConsole events={events} />
    </main>
  );
}
