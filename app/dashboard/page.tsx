import { redirect } from "next/navigation";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const tenantName = session.tenantName ?? "Unknown workspace";
  const role = session.role ?? "Member";
  const email = session.email;

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Dashboard</h1>
        <p className="auth-subtitle">Your tenant context is loaded from your active session.</p>
        <p data-testid="dashboard-email">Email: {email}</p>
        <p data-testid="tenant-name">Tenant: {tenantName}</p>
        <p data-testid="tenant-role">Role: {role}</p>
      </section>
    </main>
  );
}
