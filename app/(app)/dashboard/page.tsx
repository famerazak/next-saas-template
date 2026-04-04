import { redirect } from "next/navigation";
import { DashboardTenantNote } from "@/components/dashboard-tenant-note";
import { PendingInviteCard } from "@/components/pending-invite-card";
import { canWriteCoreApp } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPendingInvitesForEmail } from "@/lib/team/invites";
import { loadTenantSettingsForSession } from "@/lib/tenant/settings";

type DashboardPageProps = {
  searchParams?: Promise<{
    inviteError?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const tenantName = session.tenantName ?? "Unknown workspace";
  const role = session.role ?? "Member";
  const email = session.email;
  const pendingInvites = await loadPendingInvitesForEmail(email);
  const tenantSettings = await loadTenantSettingsForSession(session);

  return (
    <main className="page-shell">
      <section className="auth-card settings-card" data-testid="dashboard-page">
        <h1>Dashboard</h1>
        <p className="auth-subtitle">Your tenant context is loaded from your active session.</p>
        <p data-testid="dashboard-email">Email: {email}</p>
        <p data-testid="tenant-name">Tenant: {tenantName}</p>
        <p data-testid="tenant-role">Role: {role}</p>
        <DashboardTenantNote
          tenantId={session.tenantId ?? email}
          tenantName={tenantName}
          role={role}
          initialNote={tenantSettings.dashboardNote}
          canWrite={canWriteCoreApp(session)}
        />
        {pendingInvites.length > 0 ? (
          <PendingInviteCard initialInvites={pendingInvites} error={params.inviteError ?? ""} />
        ) : null}
      </section>
    </main>
  );
}
