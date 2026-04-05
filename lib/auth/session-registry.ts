import { createClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/session";

export type SessionRecord = {
  sessionId: string;
  userId: string;
  email: string;
  tenantName: string;
  role: string;
  userAgentLabel: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

export type PlatformSessionSummary = {
  userId: string;
  email: string;
  tenantNames: string[];
  sessionCount: number;
  lastSeenAt: string;
};

type SessionRegistryRow = {
  session_id: string;
  user_id: string;
  email: string;
  tenant_name: string | null;
  role: string | null;
  user_agent_label: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

type LocalSessionRegistry = Map<string, Map<string, SessionRecord>>;

declare global {
  // eslint-disable-next-line no-var
  var __localSessionRegistry: LocalSessionRegistry | undefined;
}

function getLocalRegistry(): LocalSessionRegistry {
  if (!globalThis.__localSessionRegistry) {
    globalThis.__localSessionRegistry = new Map<string, Map<string, SessionRecord>>();
  }

  return globalThis.__localSessionRegistry;
}

function getServiceClient() {
  if (process.env.E2E_AUTH_BYPASS === "1") {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function normalizeSessionRecord(input: Partial<SessionRecord> & Pick<SessionRecord, "sessionId" | "userId" | "email">): SessionRecord {
  return {
    sessionId: input.sessionId,
    userId: input.userId,
    email: input.email,
    tenantName: input.tenantName ?? "Workspace",
    role: input.role ?? "Member",
    userAgentLabel: input.userAgentLabel ?? "Current browser",
    createdAt: input.createdAt ?? new Date().toISOString(),
    lastSeenAt: input.lastSeenAt ?? new Date().toISOString(),
    revokedAt: input.revokedAt ?? null
  };
}

function describeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return "Current browser";
  }

  if (userAgent.includes("Playwright")) {
    return "Playwright browser";
  }
  if (userAgent.includes("Chrome")) {
    return "Chrome browser";
  }
  if (userAgent.includes("Firefox")) {
    return "Firefox browser";
  }
  if (userAgent.includes("Safari")) {
    return "Safari browser";
  }

  return "Browser session";
}

function readLocalUserSessions(userId: string): SessionRecord[] {
  const sessions = getLocalRegistry().get(userId);
  return sessions ? [...sessions.values()] : [];
}

function writeLocalSession(record: SessionRecord): SessionRecord {
  const registry = getLocalRegistry();
  const userSessions = registry.get(record.userId) ?? new Map<string, SessionRecord>();
  userSessions.set(record.sessionId, record);
  registry.set(record.userId, userSessions);
  return record;
}

function mapRow(row: SessionRegistryRow): SessionRecord {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    email: row.email,
    tenantName: row.tenant_name ?? "Workspace",
    role: row.role ?? "Member",
    userAgentLabel: row.user_agent_label ?? "Current browser",
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at
  };
}

export async function createActiveSession(
  session: AppSession & { sessionId: string },
  userAgent: string | null | undefined
) {
  const now = new Date().toISOString();
  const record = normalizeSessionRecord({
    sessionId: session.sessionId,
    userId: session.userId,
    email: session.email,
    tenantName: session.tenantName,
    role: session.role,
    userAgentLabel: describeUserAgent(userAgent),
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null
  });

  const supabase = getServiceClient();
  if (supabase) {
    const { error } = await supabase.from("user_sessions").upsert(
      {
        session_id: record.sessionId,
        user_id: record.userId,
        email: record.email,
        tenant_name: record.tenantName,
        role: record.role,
        user_agent_label: record.userAgentLabel,
        created_at: record.createdAt,
        last_seen_at: record.lastSeenAt,
        revoked_at: null
      },
      { onConflict: "session_id" }
    );

    if (!error) {
      return record;
    }
  }

  return writeLocalSession(record);
}

export async function touchActiveSession(userId: string, sessionId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const supabase = getServiceClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("user_sessions")
      .select("session_id, user_id, email, tenant_name, role, user_agent_label, created_at, last_seen_at, revoked_at")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .maybeSingle<SessionRegistryRow>();

    if (!error && data && !data.revoked_at) {
      await supabase
        .from("user_sessions")
        .update({ last_seen_at: now })
        .eq("session_id", sessionId)
        .eq("user_id", userId);
      return true;
    }
  }

  const local = readLocalUserSessions(userId).find((record) => record.sessionId === sessionId);
  if (!local || local.revokedAt) {
    return false;
  }

  writeLocalSession({
    ...local,
    lastSeenAt: now
  });
  return true;
}

export async function loadActiveSessionsForUser(userId: string): Promise<SessionRecord[]> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("user_sessions")
      .select("session_id, user_id, email, tenant_name, role, user_agent_label, created_at, last_seen_at, revoked_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false });

    if (!error && data) {
      return data.map(mapRow);
    }
  }

  return readLocalUserSessions(userId)
    .filter((record) => !record.revokedAt)
    .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}

export async function revokeUserSession(userId: string, sessionId: string): Promise<SessionRecord | null> {
  const revokedAt = new Date().toISOString();
  const supabase = getServiceClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("user_sessions")
      .update({ revoked_at: revokedAt })
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .is("revoked_at", null)
      .select("session_id, user_id, email, tenant_name, role, user_agent_label, created_at, last_seen_at, revoked_at")
      .maybeSingle<SessionRegistryRow>();

    if (!error) {
      return data ? mapRow(data) : null;
    }
  }

  const local = readLocalUserSessions(userId).find((record) => record.sessionId === sessionId);
  if (!local || local.revokedAt) {
    return null;
  }

  return writeLocalSession({
    ...local,
    revokedAt
  });
}

export async function loadPlatformSessionSummaries(): Promise<PlatformSessionSummary[]> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("user_sessions")
      .select("session_id, user_id, email, tenant_name, role, user_agent_label, created_at, last_seen_at, revoked_at")
      .is("revoked_at", null)
      .returns<SessionRegistryRow[]>();

    if (!error && data) {
      const grouped = new Map<string, PlatformSessionSummary>();
      for (const row of data.map(mapRow)) {
        const existing = grouped.get(row.userId);
        if (existing) {
          existing.sessionCount += 1;
          existing.lastSeenAt = existing.lastSeenAt > row.lastSeenAt ? existing.lastSeenAt : row.lastSeenAt;
          if (!existing.tenantNames.includes(row.tenantName)) {
            existing.tenantNames.push(row.tenantName);
            existing.tenantNames.sort((left, right) => left.localeCompare(right));
          }
          continue;
        }

        grouped.set(row.userId, {
          userId: row.userId,
          email: row.email,
          tenantNames: [row.tenantName],
          sessionCount: 1,
          lastSeenAt: row.lastSeenAt
        });
      }

      return [...grouped.values()].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
    }
  }

  const grouped = new Map<string, PlatformSessionSummary>();
  for (const userSessions of getLocalRegistry().values()) {
    for (const session of userSessions.values()) {
      if (session.revokedAt) {
        continue;
      }

      const existing = grouped.get(session.userId);
      if (existing) {
        existing.sessionCount += 1;
        existing.lastSeenAt = existing.lastSeenAt > session.lastSeenAt ? existing.lastSeenAt : session.lastSeenAt;
        if (!existing.tenantNames.includes(session.tenantName)) {
          existing.tenantNames.push(session.tenantName);
          existing.tenantNames.sort((left, right) => left.localeCompare(right));
        }
        continue;
      }

      grouped.set(session.userId, {
        userId: session.userId,
        email: session.email,
        tenantNames: [session.tenantName],
        sessionCount: 1,
        lastSeenAt: session.lastSeenAt
      });
    }
  }

  return [...grouped.values()].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}
