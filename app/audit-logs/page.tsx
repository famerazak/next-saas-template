import { redirect } from "next/navigation";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function AuditLogsPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
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
