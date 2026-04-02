import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { TeamInviteForm } from "@/components/team-invite-form";
import { TeamMembersTable } from "@/components/team-members-table";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPendingInvitesForSession } from "@/lib/team/invites";
import { loadTeamMembersForSession } from "@/lib/team/store";

export default async function TeamPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (!canAccessTenantAdminArea(session)) {
    return <NoAccessCard areaName="team management" />;
  }

  const members = await loadTeamMembersForSession(session);
  const pendingInvites = await loadPendingInvitesForSession(session);
  const tenantName = session.tenantName ?? "Workspace";

  return (
    <main className="page-shell">
      <section className="auth-card settings-card" data-testid="team-page">
        <div className="settings-header">
          <div>
            <h1>Team</h1>
            <p className="auth-subtitle">View the current members in your tenant.</p>
          </div>
        </div>
        <div className="settings-summary">
          <div>
            <span className="settings-label">Tenant</span>
            <strong data-testid="team-tenant-name">{tenantName}</strong>
          </div>
          <div>
            <span className="settings-label">Members</span>
            <strong>{members.length}</strong>
          </div>
        </div>
        <TeamInviteForm tenantName={tenantName} initialPendingInvites={pendingInvites} />
        <TeamMembersTable initialMembers={members} currentUserId={session.userId} />
      </section>
    </main>
  );
}
