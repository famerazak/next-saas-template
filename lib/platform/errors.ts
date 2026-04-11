import { createClient } from "@supabase/supabase-js";

export type PlatformAppErrorSeverity = "error" | "warning";

export type PlatformAppErrorRecord = {
  id: string;
  fingerprint: string;
  source: string;
  route: string;
  message: string;
  severity: PlatformAppErrorSeverity;
  metadata: Record<string, string | number | boolean | null>;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
};

type PlatformAppErrorRow = {
  id: string;
  fingerprint: string;
  source: string;
  route: string;
  message: string;
  severity: PlatformAppErrorSeverity;
  metadata: Record<string, string | number | boolean | null> | null;
  first_seen_at: string;
  last_seen_at: string;
  occurrence_count: number;
};

type LocalPlatformErrorStore = Map<string, PlatformAppErrorRecord>;

declare global {
  // eslint-disable-next-line no-var
  var __localPlatformAppErrorStore: LocalPlatformErrorStore | undefined;
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || process.env.E2E_AUTH_BYPASS === "1") {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getLocalStore(): LocalPlatformErrorStore {
  if (!globalThis.__localPlatformAppErrorStore) {
    globalThis.__localPlatformAppErrorStore = new Map<string, PlatformAppErrorRecord>();
  }

  return globalThis.__localPlatformAppErrorStore;
}

function toRecord(row: PlatformAppErrorRow): PlatformAppErrorRecord {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    source: row.source,
    route: row.route,
    message: row.message,
    severity: row.severity,
    metadata: row.metadata ?? {},
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    occurrenceCount: row.occurrence_count
  };
}

function buildFingerprint(input: { source: string; route: string; message: string }) {
  return `${input.source.toLowerCase()}::${input.route.toLowerCase()}::${input.message.trim().toLowerCase()}`;
}

function upsertLocalRecord(record: PlatformAppErrorRecord): PlatformAppErrorRecord {
  const store = getLocalStore();
  const existing = store.get(record.fingerprint);

  if (!existing) {
    store.set(record.fingerprint, record);
    return record;
  }

  const nextRecord: PlatformAppErrorRecord = {
    ...existing,
    severity: record.severity,
    metadata: record.metadata,
    lastSeenAt: record.lastSeenAt,
    occurrenceCount: existing.occurrenceCount + 1
  };
  store.set(record.fingerprint, nextRecord);
  return nextRecord;
}

export async function recordPlatformAppError(input: {
  source: string;
  route: string;
  message: string;
  severity?: PlatformAppErrorSeverity;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<PlatformAppErrorRecord> {
  const now = new Date().toISOString();
  const record: PlatformAppErrorRecord = {
    id: `app_err_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    fingerprint: buildFingerprint(input),
    source: input.source,
    route: input.route,
    message: input.message.trim(),
    severity: input.severity ?? "error",
    metadata: input.metadata ?? {},
    firstSeenAt: now,
    lastSeenAt: now,
    occurrenceCount: 1
  };

  const supabase = getServiceClient();
  if (!supabase) {
    return upsertLocalRecord(record);
  }

  const { data: existing } = await supabase
    .from("platform_app_errors")
    .select("id, fingerprint, source, route, message, severity, metadata, first_seen_at, last_seen_at, occurrence_count")
    .eq("fingerprint", record.fingerprint)
    .maybeSingle<PlatformAppErrorRow>();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("platform_app_errors")
      .update({
        severity: record.severity,
        metadata: record.metadata,
        last_seen_at: record.lastSeenAt,
        occurrence_count: existing.occurrence_count + 1
      })
      .eq("fingerprint", record.fingerprint)
      .select("id, fingerprint, source, route, message, severity, metadata, first_seen_at, last_seen_at, occurrence_count")
      .single<PlatformAppErrorRow>();

    if (!error && updated) {
      return toRecord(updated);
    }
  } else {
    const { data: inserted, error } = await supabase
      .from("platform_app_errors")
      .insert({
        id: record.id,
        fingerprint: record.fingerprint,
        source: record.source,
        route: record.route,
        message: record.message,
        severity: record.severity,
        metadata: record.metadata,
        first_seen_at: record.firstSeenAt,
        last_seen_at: record.lastSeenAt,
        occurrence_count: record.occurrenceCount
      })
      .select("id, fingerprint, source, route, message, severity, metadata, first_seen_at, last_seen_at, occurrence_count")
      .single<PlatformAppErrorRow>();

    if (!error && inserted) {
      return toRecord(inserted);
    }
  }

  return upsertLocalRecord(record);
}

export async function loadPlatformAppErrors(options?: { limit?: number }): Promise<PlatformAppErrorRecord[]> {
  const limit = Math.max(1, Math.min(options?.limit ?? 25, 100));
  const supabase = getServiceClient();

  if (!supabase) {
    return [...getLocalStore().values()]
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from("platform_app_errors")
    .select("id, fingerprint, source, route, message, severity, metadata, first_seen_at, last_seen_at, occurrence_count")
    .order("last_seen_at", { ascending: false })
    .limit(limit)
    .returns<PlatformAppErrorRow[]>();

  if (error || !data) {
    return [...getLocalStore().values()]
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
      .slice(0, limit);
  }

  return data.map(toRecord);
}
