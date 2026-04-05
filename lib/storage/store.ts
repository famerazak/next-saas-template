import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/session";

export type TenantFileRecord = {
  id: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  uploadedByEmail: string;
  createdAt: string;
};

type TenantFileRow = {
  id: string;
  tenant_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  content_base64: string;
  uploaded_by_user_id: string;
  uploaded_by_email: string;
  created_at: string;
};

type StoredTenantFile = TenantFileRecord & {
  contentBase64: string;
};

type TenantFileUploadInput = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
};

type LocalTenantFileStore = Map<string, StoredTenantFile[]>;

declare global {
  // eslint-disable-next-line no-var
  var __localTenantFileStore: LocalTenantFileStore | undefined;
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

function getLocalTenantFileStore(): LocalTenantFileStore {
  if (!globalThis.__localTenantFileStore) {
    globalThis.__localTenantFileStore = new Map<string, StoredTenantFile[]>();
  }

  return globalThis.__localTenantFileStore;
}

function normalizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  const withoutPath = trimmed.split(/[/\\]/).pop() ?? trimmed;
  return withoutPath.slice(0, 160) || "upload.bin";
}

function toRecord(row: TenantFileRow): TenantFileRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedByEmail: row.uploaded_by_email,
    createdAt: row.created_at
  };
}

function readLocalFiles(tenantId: string): TenantFileRecord[] {
  return (getLocalTenantFileStore().get(tenantId) ?? []).map(({ contentBase64: _contentBase64, ...record }) => record);
}

function writeLocalFile(file: StoredTenantFile): TenantFileRecord {
  const store = getLocalTenantFileStore();
  const existing = store.get(file.tenantId) ?? [];
  store.set(
    file.tenantId,
    [file, ...existing.filter((entry) => entry.id !== file.id)].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    )
  );

  const { contentBase64: _contentBase64, ...record } = file;
  return record;
}

export async function loadTenantFilesForSession(session: AppSession): Promise<TenantFileRecord[]> {
  if (!session.tenantId) {
    return [];
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return readLocalFiles(session.tenantId);
  }

  const { data, error } = await supabase
    .from("tenant_files")
    .select("id, tenant_id, file_name, mime_type, size_bytes, content_base64, uploaded_by_user_id, uploaded_by_email, created_at")
    .eq("tenant_id", session.tenantId)
    .order("created_at", { ascending: false })
    .returns<TenantFileRow[]>();

  if (error || !data) {
    return readLocalFiles(session.tenantId);
  }

  return data.map(toRecord);
}

export async function uploadTenantFileForSession(
  session: AppSession,
  input: TenantFileUploadInput
): Promise<TenantFileRecord> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required before uploading files.");
  }

  const stored: StoredTenantFile = {
    id: randomUUID(),
    tenantId: session.tenantId,
    fileName: normalizeFileName(input.fileName),
    mimeType: input.mimeType || "application/octet-stream",
    sizeBytes: input.sizeBytes,
    contentBase64: input.contentBase64,
    uploadedByUserId: session.userId,
    uploadedByEmail: session.email,
    createdAt: new Date().toISOString()
  };

  const supabase = getServiceClient();
  if (!supabase) {
    return writeLocalFile(stored);
  }

  const { data, error } = await supabase
    .from("tenant_files")
    .insert({
      id: stored.id,
      tenant_id: stored.tenantId,
      file_name: stored.fileName,
      mime_type: stored.mimeType,
      size_bytes: stored.sizeBytes,
      content_base64: stored.contentBase64,
      uploaded_by_user_id: stored.uploadedByUserId,
      uploaded_by_email: stored.uploadedByEmail,
      created_at: stored.createdAt
    })
    .select("id, tenant_id, file_name, mime_type, size_bytes, content_base64, uploaded_by_user_id, uploaded_by_email, created_at")
    .maybeSingle<TenantFileRow>();

  if (error || !data) {
    return writeLocalFile(stored);
  }

  return toRecord(data);
}
