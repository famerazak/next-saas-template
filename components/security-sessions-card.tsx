"use client";

import { useState } from "react";
import type { SessionRecord } from "@/lib/auth/session-registry";

type SecuritySessionsCardProps = {
  currentSessionId: string | null;
  initialSessions: SessionRecord[];
};

type SessionState = {
  sessions: SessionRecord[];
  revokingId: string | null;
  error: string;
  success: string;
};

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "Recently";
  }

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function SecuritySessionsCard({
  currentSessionId,
  initialSessions
}: SecuritySessionsCardProps) {
  const [state, setState] = useState<SessionState>({
    sessions: initialSessions,
    revokingId: null,
    error: "",
    success: ""
  });

  async function revokeSession(sessionId: string) {
    setState((current) => ({
      ...current,
      revokingId: sessionId,
      error: "",
      success: ""
    }));

    const response = await fetch("/api/security/sessions/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      revokedSessionId?: string;
    };

    if (!response.ok || !payload.revokedSessionId) {
      setState((current) => ({
        ...current,
        revokingId: null,
        error: payload.error ?? "Could not revoke the selected session.",
        success: ""
      }));
      return;
    }

    setState((current) => ({
      sessions: current.sessions.filter((session) => session.sessionId !== payload.revokedSessionId),
      revokingId: null,
      error: "",
      success: "Session revoked."
    }));
  }

  return (
    <div className="security-sessions-card" data-testid="security-sessions-card">
      <div className="security-sessions-summary">
        <div>
          <span className="settings-label">Active sessions</span>
          <strong data-testid="security-session-count">
            {state.sessions.length} active session{state.sessions.length === 1 ? "" : "s"}
          </strong>
          <p className="auth-subtitle">
            Revoke any session you no longer trust. Your current browser stays active.
          </p>
        </div>
      </div>

      <div className="security-sessions-list" data-testid="security-session-list">
        {state.sessions.map((session) => {
          const isCurrent = currentSessionId === session.sessionId;
          return (
            <article
              key={session.sessionId}
              className="security-session-card"
              data-testid={`security-session-row-${session.sessionId}`}
            >
              <div className="security-session-card-copy">
                <strong>{isCurrent ? "Current session" : session.userAgentLabel}</strong>
                <span>{session.email}</span>
                <span>{session.tenantName}</span>
                <span>Last active {formatTimestamp(session.lastSeenAt)}</span>
              </div>
              <div className="security-session-card-actions">
                {isCurrent ? (
                  <span
                    className="security-status-badge is-good"
                    data-testid={`security-session-current-badge-${session.sessionId}`}
                  >
                    Current
                  </span>
                ) : (
                  <button
                    type="button"
                    className="auth-secondary-button"
                    data-testid={`security-session-revoke-${session.sessionId}`}
                    onClick={() => revokeSession(session.sessionId)}
                    disabled={state.revokingId === session.sessionId}
                  >
                    {state.revokingId === session.sessionId ? "Revoking..." : "Revoke"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {state.error ? (
        <p role="alert" className="auth-error" data-testid="security-session-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="auth-success" data-testid="security-session-success">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}
