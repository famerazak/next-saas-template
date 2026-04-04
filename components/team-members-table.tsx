"use client";

import { useState } from "react";
import type { EditableTeamRole, TeamMember } from "@/lib/team/store";

type TeamMembersTableProps = {
  currentUserId: string;
  initialMembers: TeamMember[];
};

type SaveState = {
  savingId: string | null;
  removingId: string | null;
  error: string;
  success: string;
};

const EDITABLE_ROLES: EditableTeamRole[] = ["Admin", "Member", "Viewer"];

export function TeamMembersTable({ currentUserId, initialMembers }: TeamMembersTableProps) {
  const [members, setMembers] = useState(initialMembers);
  const [draftRoles, setDraftRoles] = useState<Record<string, EditableTeamRole>>(() =>
    Object.fromEntries(
      initialMembers
        .filter((member) => member.role !== "Owner")
        .map((member) => [member.id, (member.role === "Owner" ? "Member" : member.role) as EditableTeamRole])
    )
  );
  const [state, setState] = useState<SaveState>({
    savingId: null,
    removingId: null,
    error: "",
    success: ""
  });

  async function updateRole(memberId: string) {
    const nextRole = draftRoles[memberId];
    if (!nextRole) {
      return;
    }

    setState({ savingId: memberId, removingId: null, error: "", success: "" });

    const response = await fetch("/api/team/member-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: memberId,
        role: nextRole
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      member?: TeamMember;
    };

    if (!response.ok || !payload.member) {
      setState({
        savingId: null,
        removingId: null,
        error: payload.error ?? "Could not update member role.",
        success: ""
      });
      return;
    }

    const updatedMember = payload.member;

    setMembers((current) =>
      current.map((member) => (member.id === updatedMember.id ? updatedMember : member))
    );
    setDraftRoles((current) => ({
      ...current,
      [memberId]:
        updatedMember.role === "Owner" ? "Member" : (updatedMember.role as EditableTeamRole)
    }));
    setState({
      savingId: null,
      removingId: null,
      error: "",
      success: `${updatedMember.email} is now ${updatedMember.role}.`
    });
  }

  async function removeMember(memberId: string) {
    const targetMember = members.find((member) => member.id === memberId);
    if (!targetMember) {
      return;
    }

    setState({ savingId: null, removingId: memberId, error: "", success: "" });

    const response = await fetch("/api/team/member-remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: memberId
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      member?: TeamMember;
    };

    if (!response.ok || !payload.member) {
      setState({
        savingId: null,
        removingId: null,
        error: payload.error ?? "Could not remove team member.",
        success: ""
      });
      return;
    }

    setState({
      savingId: null,
      removingId: null,
      error: "",
      success: `${targetMember.email} was removed from the tenant.`
    });
    setMembers((current) => current.filter((member) => member.id !== memberId));
    setDraftRoles((current) => {
      const next = { ...current };
      delete next[memberId];
      return next;
    });
  }

  return (
    <section className="team-members-card" data-testid="team-members-card">
      <div className="settings-header team-members-header">
        <div>
          <h2>Members</h2>
          <p className="auth-subtitle">Update member access for this tenant.</p>
        </div>
        <div className="team-members-count-pill" data-testid="team-member-count">
          {members.length} active
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="auth-error" data-testid="team-member-role-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="auth-success" data-testid="team-member-role-success">
          {state.success}
        </p>
      ) : null}

      <div className="team-members-table" data-testid="team-member-list">
        <div className="team-members-table-header">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          const canEditRole = !isCurrentUser && member.role !== "Owner";
          const canRemoveMember = !isCurrentUser && member.role !== "Owner";
          const selectedRole = draftRoles[member.id] ?? "Member";
          const roleChanged = canEditRole && selectedRole !== member.role;
          const isBusy = state.savingId === member.id || state.removingId === member.id;

          return (
            <div
              className="team-members-table-row"
              key={member.id}
              data-testid={`team-member-row-${member.id}`}
            >
              <div className="team-member-primary">
                <span>{member.fullName || "Unknown"}</span>
                {isCurrentUser ? <span className="team-member-note">Current user</span> : null}
              </div>
              <span className="team-members-email">{member.email}</span>
              {canEditRole ? (
                <div className="team-role-control">
                  <select
                    aria-label={`Role for ${member.email}`}
                    className="team-member-role-select"
                    data-testid={`team-member-role-select-${member.id}`}
                    value={selectedRole}
                    onChange={(event) =>
                      setDraftRoles((current) => ({
                        ...current,
                        [member.id]: event.target.value as EditableTeamRole
                      }))
                    }
                  >
                    {EDITABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="team-role-static" data-testid={`team-member-role-value-${member.id}`}>
                  {member.role}
                </span>
              )}
              <span className="team-members-status">{member.status}</span>
              <div className="team-members-action">
                {canEditRole ? (
                  <div className="team-members-action-stack">
                    <button
                      type="button"
                      className="team-role-save"
                      data-testid={`team-member-role-save-${member.id}`}
                      disabled={!roleChanged || isBusy}
                      onClick={() => updateRole(member.id)}
                    >
                      {state.savingId === member.id ? "Saving..." : "Save"}
                    </button>
                    {canRemoveMember ? (
                      <button
                        type="button"
                        className="team-member-remove"
                        data-testid={`team-member-remove-${member.id}`}
                        disabled={isBusy}
                        onClick={() => removeMember(member.id)}
                      >
                        {state.removingId === member.id ? "Removing..." : "Remove"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <span className="team-role-static">Locked</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
