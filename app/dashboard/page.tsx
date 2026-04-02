import { redirect } from "next/navigation";
import { PendingInviteCard } from "@/components/pending-invite-card";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPendingInvitesForEmail } from "@/lib/team/invites";

export default async function DashboardPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const tenantName = session.tenantName ?? "Unknown workspace";
  const role = session.role ?? "Member";
  const email = session.email;
  const pendingInvites = await loadPendingInvitesForEmail(email);

  return (
    <main className="page-shell">
      <section className="auth-card settings-card" data-testid="dashboard-page">
        <h1>Dashboard</h1>
        <p className="auth-subtitle">Your tenant context is loaded from your active session.</p>
        <p data-testid="dashboard-email">Email: {email}</p>
        <p data-testid="tenant-name">Tenant: {tenantName}</p>
        <p data-testid="tenant-role">Role: {role}</p>
        {pendingInvites.length > 0 ? <PendingInviteCard initialInvites={pendingInvites} /> : null}
      </section>
    </main>
  );
}
