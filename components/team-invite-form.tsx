"use client";

import { FormEvent, useState } from "react";
import { formatRateLimitMessage } from "@/lib/rate-limit";

type InviteRole = "Admin" | "Member" | "Viewer";

type PendingInvite = {
  id: string;
  email: string;
  role: InviteRole;
  status: "Pending";
};

type TeamInviteFormProps = {
  tenantName: string;
  initialPendingInvites?: PendingInvite[];
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function createInviteId() {
  return `invite-${crypto.randomUUID()}`;
}

function parseInviteError(payload: { error?: string } | null, fallback: string) {
  return formatRateLimitMessage(payload ?? {}, fallback);
}

export function TeamInviteForm({ tenantName, initialPendingInvites = [] }: TeamInviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("Member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialPendingInvites);
  const pendingCount = pendingInvites.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Enter a valid email address.");
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const response = await fetch("/api/team/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: normalizedEmail,
        role
      })
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          invite?: PendingInvite;
          pendingInvite?: PendingInvite;
        }
      | null;

    if (!response.ok) {
      setLoading(false);
      setError(parseInviteError(payload, "Could not send invite."));
      return;
    }

    const invite =
      payload?.invite ??
      payload?.pendingInvite ??
      ({
        id: createInviteId(),
        email: normalizedEmail,
        role,
        status: "Pending"
      } satisfies PendingInvite);

    setPendingInvites((current) => [invite, ...current.filter((item) => item.email !== invite.email)]);
    setEmail("");
    setRole("Member");
    setLoading(false);
    setSuccess("Invite sent.");
  }

  return (
    <section className="team-invite-card" data-testid="team-invite-card">
      <div className="settings-header team-invite-header">
        <div>
          <h2>Invite member</h2>
          <p className="auth-subtitle">Send a new tenant invite for {tenantName}.</p>
        </div>
        <div className="team-invite-pill" data-testid="team-invite-pending-count">
          {pendingCount} pending
        </div>
      </div>

      <form className="auth-form team-invite-form" data-testid="team-invite-form" onSubmit={handleSubmit}>
        <div className="team-invite-grid">
          <label htmlFor="invite-email">
            Email address
            <input
              id="invite-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="new.user@company.com"
              data-testid="team-invite-email-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label htmlFor="invite-role">
            Role
            <select
              id="invite-role"
              name="role"
              data-testid="team-invite-role-select"
              value={role}
              onChange={(event) => setRole(event.target.value as InviteRole)}
            >
              <option value="Admin">Admin</option>
              <option value="Member">Member</option>
              <option value="Viewer">Viewer</option>
            </select>
          </label>
          <button type="submit" disabled={loading} data-testid="team-invite-submit">
            {loading ? "Sending..." : "Invite member"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="auth-error" data-testid="team-invite-error">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="auth-success" data-testid="team-invite-success">
            {success}
          </p>
        ) : null}
      </form>

      <div className="team-invite-list-wrap">
        <div className="settings-label">Pending invites</div>
        <div className="team-invite-list" data-testid="team-pending-invites">
          {pendingInvites.length === 0 ? (
            <div className="team-empty-state" data-testid="team-pending-invites-empty">
              No pending invites yet.
            </div>
          ) : (
            pendingInvites.map((invite) => (
              <div className="team-invite-row" key={invite.id} data-testid={`team-pending-invite-${invite.id}`}>
                <div className="team-invite-copy">
                  <strong>{invite.email}</strong>
                  <span>{invite.role}</span>
                </div>
                <span className="team-badge team-badge-pending">{invite.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
