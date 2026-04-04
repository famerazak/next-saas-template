"use client";

import { FormEvent, useState } from "react";
import type { TenantRole } from "@/lib/tenant/context";

type DashboardTenantNoteProps = {
  tenantId: string;
  tenantName: string;
  role: TenantRole;
  initialNote: string;
  canWrite: boolean;
};

type NoteState = {
  note: string;
  saving: boolean;
  error: string;
  success: string;
};

export function DashboardTenantNote({
  tenantId,
  tenantName,
  role,
  initialNote,
  canWrite
}: DashboardTenantNoteProps) {
  const [state, setState] = useState<NoteState>({
    note: initialNote,
    saving: false,
    error: "",
    success: ""
  });

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      return;
    }

    setState((current) => ({
      ...current,
      saving: true,
      error: "",
      success: ""
    }));

    const response = await fetch("/api/dashboard-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dashboardNote: state.note
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      settings?: { dashboardNote?: string };
    };

    if (!response.ok) {
      setState((current) => ({
        ...current,
        saving: false,
        error: payload.error ?? "Could not save dashboard note.",
        success: ""
      }));
      return;
    }

    setState((current) => ({
      ...current,
      note: payload.settings?.dashboardNote ?? current.note,
      saving: false,
      error: "",
      success: "Dashboard note updated."
    }));
  }

  return (
    <section className="dashboard-note-card" data-testid="dashboard-tenant-note-card" data-tenant-id={tenantId}>
      <div className="dashboard-note-header">
        <div>
          <p className="dashboard-note-eyebrow">Tenant note</p>
          <h2>{tenantName}</h2>
        </div>
        <span
          className={`dashboard-note-access${canWrite ? " dashboard-note-access--editable" : " dashboard-note-access--readonly"}`}
          data-testid="dashboard-tenant-note-access"
        >
          {canWrite ? "Editable by Owner/Admin" : "Read only for your role."}
        </span>
      </div>

      <p className="dashboard-note-copy">
        {canWrite
          ? "Owner and Admin roles can update this shared note. Members and Viewers can see it, but cannot change it."
          : `Your ${role} role can view this tenant-wide note, but cannot edit it.`}
      </p>

      <form className="dashboard-note-editor" data-testid="dashboard-shared-note-form" onSubmit={saveNote}>
        <label htmlFor="dashboard-tenant-note">Shared tenant note</label>
        <textarea
          id="dashboard-tenant-note"
          data-testid="dashboard-shared-note-input"
          value={state.note}
          disabled={!canWrite}
          readOnly={!canWrite}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              note: event.target.value
            }))
          }
          rows={6}
          maxLength={500}
        />
        <div className="dashboard-note-actions">
          <button
            type="submit"
            className="dashboard-note-save"
            data-testid="dashboard-shared-note-save"
            disabled={!canWrite || state.saving || state.note.trim().length === 0}
          >
            {state.saving ? "Saving..." : "Save dashboard note"}
          </button>
          <span className="dashboard-note-limit">500 character limit</span>
        </div>
        {!canWrite ? (
          <p className="dashboard-note-readonly" data-testid="dashboard-shared-note-readonly">
            Read only for your role.
          </p>
        ) : null}
      </form>

      {state.error ? (
        <p role="alert" className="auth-error" data-testid="dashboard-note-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="auth-success" data-testid="dashboard-note-success">
          {state.success}
        </p>
      ) : null}

      <div className="dashboard-note-readback" data-testid="dashboard-note-readback">
        <p>{state.note || "No shared note yet."}</p>
      </div>
    </section>
  );
}
