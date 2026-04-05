import { createClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/session";

export type TenantAuditOrigin = "tenant" | "platform";

export type TenantAuditAction =
  | "tenant.settings.updated"
  | "team.invite.created"
  | "team.member.role_changed"
  | "platform.member.role_changed"
  | "team.member.removed"
  | "team.ownership.transferred"
  | "billing.checkout.started"
  | "billing.payment_method.updated"
  | "platform.webhook.retry"
  | "platform.billing.adjusted"
  | "platform.support.updated"
  | "platform.flags.updated";

export type TenantAuditMetadata = Record<string, string | number | boolean | null>;

export type TenantAuditEvent = {
  id: string;
  tenantId: string;
  action: TenantAuditAction | string;
  summary: string;
  actorUserId: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  origin: TenantAuditOrigin;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  metadata: TenantAuditMetadata;
  occurredAt: string;
};

type AuditLogRow = {
  id: string;
  tenant_id: string;
  action: string;
  summary: string;
  actor_user_id: string;
  actor_email: string;
  actor_name: string | null;
  actor_role: string | null;
  origin: TenantAuditOrigin;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: TenantAuditMetadata | null;
  occurred_at: string;
};

type LocalTenantAuditStore = Map<string, TenantAuditEvent[]>;

declare global {
  // eslint-disable-next-line no-var
  var __localTenantAuditStore: LocalTenantAuditStore | undefined;
}

function getServiceClient() {
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

function getLocalStore(): LocalTenantAuditStore {
  if (!globalThis.__localTenantAuditStore) {
    globalThis.__localTenantAuditStore = new Map<string, TenantAuditEvent[]>();
  }

  return globalThis.__localTenantAuditStore;
}

function actorNameFromSession(session: AppSession): string {
  return session.fullName?.trim() || session.email;
}

function actorRoleFromSession(session: AppSession): string {
  return session.role ?? (session.isPlatformAdmin ? "Platform Admin" : "Member");
}

function toEvent(row: AuditLogRow): TenantAuditEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    action: row.action,
    summary: row.summary,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    actorName: row.actor_name || row.actor_email,
    actorRole: row.actor_role || "Member",
    origin: row.origin,
    targetType: row.target_type ?? undefined,
    targetId: row.target_id ?? undefined,
    targetLabel: row.target_label ?? undefined,
    metadata: row.metadata ?? {},
    occurredAt: row.occurred_at
  };
}

export async function recordTenantAuditEventForSession(
  session: AppSession,
  input: {
    tenantId?: string;
    action: TenantAuditAction | string;
    summary: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    metadata?: TenantAuditMetadata;
    origin?: TenantAuditOrigin;
  }
): Promise<{ event: TenantAuditEvent; persistedToDatabase: boolean }> {
  const targetTenantId = input.tenantId ?? session.tenantId;
  if (!targetTenantId) {
    throw new Error("Tenant context is required.");
  }

  const event: TenantAuditEvent = {
    id: `audit_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    tenantId: targetTenantId,
    action: input.action,
    summary: input.summary,
    actorUserId: session.userId,
    actorEmail: session.email,
    actorName: actorNameFromSession(session),
    actorRole: actorRoleFromSession(session),
    origin: input.origin ?? "tenant",
    targetType: input.targetType,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    metadata: input.metadata ?? {},
    occurredAt: new Date().toISOString()
  };

  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    const store = getLocalStore();
    const existing = store.get(targetTenantId) ?? [];
    store.set(targetTenantId, [event, ...existing].slice(0, 250));
    return {
      event,
      persistedToDatabase: false
    };
  }

  const { data, error } = await supabase
    .from("tenant_audit_logs")
    .insert({
      id: event.id,
      tenant_id: event.tenantId,
      action: event.action,
      summary: event.summary,
      actor_user_id: event.actorUserId,
      actor_email: event.actorEmail,
      actor_name: event.actorName,
      actor_role: event.actorRole,
      origin: event.origin,
      target_type: event.targetType ?? null,
      target_id: event.targetId ?? null,
      target_label: event.targetLabel ?? null,
      metadata: event.metadata,
      occurred_at: event.occurredAt
    })
    .select(
      "id, tenant_id, action, summary, actor_user_id, actor_email, actor_name, actor_role, origin, target_type, target_id, target_label, metadata, occurred_at"
    )
    .single();

  if (error || !data) {
    const store = getLocalStore();
    const existing = store.get(targetTenantId) ?? [];
    store.set(targetTenantId, [event, ...existing].slice(0, 250));
    return {
      event,
      persistedToDatabase: false
    };
  }

  return {
    event: toEvent(data as AuditLogRow),
    persistedToDatabase: true
  };
}

export async function loadTenantAuditEventsForSession(
  session: AppSession,
  options?: { limit?: number }
): Promise<TenantAuditEvent[]> {
  if (!session.tenantId) {
    return [];
  }

  const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));
  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    return (getLocalStore().get(session.tenantId) ?? []).slice(0, limit);
  }

  const { data, error } = await supabase
    .from("tenant_audit_logs")
    .select(
      "id, tenant_id, action, summary, actor_user_id, actor_email, actor_name, actor_role, origin, target_type, target_id, target_label, metadata, occurred_at"
    )
    .eq("tenant_id", session.tenantId)
    .order("occurred_at", { ascending: false })
    .limit(limit)
    .returns<AuditLogRow[]>();

  if (error || !data) {
    return (getLocalStore().get(session.tenantId) ?? []).slice(0, limit);
  }

  return data.map(toEvent);
}

export async function loadPlatformAuditEvents(options?: { limit?: number }): Promise<TenantAuditEvent[]> {
  const limit = Math.max(1, Math.min(options?.limit ?? 100, 250));
  const supabase = getServiceClient();
  if (!supabase || process.env.E2E_AUTH_BYPASS === "1") {
    return [...getLocalStore().values()]
      .flatMap((events) => events)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from("tenant_audit_logs")
    .select(
      "id, tenant_id, action, summary, actor_user_id, actor_email, actor_name, actor_role, origin, target_type, target_id, target_label, metadata, occurred_at"
    )
    .order("occurred_at", { ascending: false })
    .limit(limit)
    .returns<AuditLogRow[]>();

  if (error || !data) {
    return [...getLocalStore().values()]
      .flatMap((events) => events)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, limit);
  }

  return data.map(toEvent);
}
