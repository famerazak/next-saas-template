"use client";

import { useState } from "react";
import type { TeamMember } from "@/lib/team/store";
import type { TenantRole } from "@/lib/tenant/context";

type EditableRole = Extract<TenantRole, "Admin" | "Member" | "Viewer">;

type TeamMembersTableProps = {
  initialMembers: TeamMember[];
  currentUserId: string;
};

export function TeamMembersTable({ initialMembers, currentUserId }: TeamMembersTableProps) {
  const [members, setMembers] = useState(initialMembers);
  const [draftRoles, setDraftRoles] = useState<Record<string, EditableRole>>(
    Object.fromEntries(
      initialMembers.map((member) => [
        member.id,
        (member.role === "Owner" ? "Admin" : member.role) as EditableRole
      ])
    )
  );
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const memberCount = members.length;

  function canEdit(member: TeamMember) {
    return member.role !== "Owner" && member.id !== currentUserId;
  }

  async function updateRole(member: TeamMember) {
    const nextRole = draftRoles[member.id];
    if (!nextRole || nextRole === member.role) {
      setMessage("No role change to save.");
      setError("");
      return;
    }

    setSubmittingId(member.id);
    setMessage("");
    setError("");

    const response = await fetch("/api/team/member-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: member.id,
        role: nextRole
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      member?: TeamMember;
    };

    if (!response.ok || !payload.member) {
      setSubmittingId(null);
      setError(payload.error ?? "Could not update member role.");
      return;
    }

    setMembers((current) =>
      current.map((entry) => (entry.id === payload.member?.id ? payload.member : entry))
    );
    setDraftRoles((current) => ({
      ...current,
      [member.id]: payload.member?.role as EditableRole
    }));
    setSubmittingId(null);
    setMessage(`Role updated for ${payload.member.email}.`);
  }

  return (
    <div className="team-members-card">
      <div className="team-members-header">
        <div className="settings-label">Members</div>
        <strong data-testid="team-member-count">{memberCount}</strong>
      </div>
      {error ? (
        <p role="alert" className="auth-error" data-testid="team-role-error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="auth-success" data-testid="team-role-success">
          {message}
        </p>
      ) : null}
      <div className="team-table" data-testid="team-member-list">
        <div className="team-table-header team-table-header-members">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {members.map((member) => (
          <div className="team-table-row team-table-row-members" key={member.id} data-testid={`team-member-${member.id}`}>
            <span>{member.fullName || "Unknown"}</span>
            <span>{member.email}</span>
            <span>
              {canEdit(member) ? (
                <select
                  data-testid={`team-role-select-${member.id}`}
                  value={draftRoles[member.id] ?? member.role}
                  onChange={(event) =>
                    setDraftRoles((current) => ({
                      ...current,
                      [member.id]: event.target.value as EditableRole
                    }))
                  }
                >
                  <option value="Admin">Admin</option>
                  <option value="Member">Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
              ) : (
                member.role
              )}
            </span>
            <span>{member.status}</span>
            <span>
              {canEdit(member) ? (
                <button
                  type="button"
                  className="team-role-button"
                  data-testid={`team-role-save-${member.id}`}
                  disabled={submittingId === member.id}
                  onClick={() => updateRole(member)}
                >
                  {submittingId === member.id ? "Saving..." : "Save role"}
                </button>
              ) : (
                <span className="team-role-readonly">Read only</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
