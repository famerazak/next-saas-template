import type { PendingInvite } from "@/lib/team/invites";

type PendingInviteCardProps = {
  initialInvites: PendingInvite[];
  error?: string;
};

export function PendingInviteCard({ initialInvites, error = "" }: PendingInviteCardProps) {
  return (
    <section className="dashboard-invites-card" data-testid="pending-invites-card">
      <div className="settings-header">
        <div>
          <h2>Pending invites</h2>
          <p className="auth-subtitle">Join a workspace you have been invited to.</p>
        </div>
      </div>
      {error ? (
        <p role="alert" className="auth-error" data-testid="pending-invites-error">
          {error}
        </p>
      ) : null}
      <div className="team-invite-list" data-testid="pending-invites-list">
        {initialInvites.map((invite) => (
          <div className="team-invite-row" key={invite.id} data-testid={`pending-invite-${invite.id}`}>
            <div className="team-invite-copy">
              <strong>{invite.tenantName}</strong>
              <span>
                {invite.role} access for {invite.email}
              </span>
            </div>
            <form method="post" action="/api/team/invite/accept">
              <input type="hidden" name="inviteId" value={invite.id} />
              <button type="submit" className="accept-invite-button">
                Accept invite
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
