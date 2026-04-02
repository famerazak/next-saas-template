"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PendingInvite } from "@/lib/team/invites";

type PendingInviteCardProps = {
  initialInvites: PendingInvite[];
};

export function PendingInviteCard({ initialInvites }: PendingInviteCardProps) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function acceptInvite(inviteId: string) {
    setSubmittingId(inviteId);
    setError("");

    const response = await fetch("/api/team/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setSubmittingId(null);
      setError(payload.error ?? "Could not accept invite.");
      return;
    }

    setInvites((current) => current.filter((invite) => invite.id !== inviteId));
    setSubmittingId(null);
    router.refresh();
  }

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
        {invites.map((invite) => (
          <div className="team-invite-row" key={invite.id} data-testid={`pending-invite-${invite.id}`}>
            <div className="team-invite-copy">
              <strong>{invite.tenantName}</strong>
              <span>
                {invite.role} access for {invite.email}
              </span>
            </div>
            <button
              type="button"
              className="accept-invite-button"
              disabled={submittingId === invite.id}
              onClick={() => acceptInvite(invite.id)}
            >
              {submittingId === invite.id ? "Accepting..." : "Accept invite"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
