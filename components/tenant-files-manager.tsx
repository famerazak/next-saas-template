"use client";

import { useRef, useState, type FormEvent } from "react";
import type { TenantFileRecord } from "@/lib/storage/store";

type TenantFilesManagerProps = {
  canUpload: boolean;
  roleLabel: string;
  tenantName: string;
  initialFiles: TenantFileRecord[];
};

type UploadResponse = {
  error?: string;
  file?: TenantFileRecord;
};

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function TenantFilesManager({ canUpload, roleLabel, tenantName, initialFiles }: TenantFilesManagerProps) {
  const [files, setFiles] = useState(initialFiles);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file before uploading.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch("/api/files", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as UploadResponse | null;
    setIsUploading(false);

    if (!response.ok || !payload?.file) {
      setError(payload?.error ?? "Upload failed.");
      return;
    }

    setFiles((current) => [
      payload.file as TenantFileRecord,
      ...current.filter((entry) => entry.id !== payload.file?.id)
    ]);
    setMessage(`${payload.file.fileName} uploaded successfully.`);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <section className="auth-card settings-card tenant-files-card" data-testid="tenant-files-page">
      <div className="settings-header">
        <div>
          <h1>Files</h1>
          <p className="auth-subtitle">
            Shared tenant files stay scoped to {tenantName}. This starter keeps the list visible to all signed-in users.
          </p>
        </div>
        <span className="security-status-badge is-pending" data-testid="tenant-files-role-badge">
          {roleLabel}
        </span>
      </div>

      <div className="platform-kpi-grid">
        <article className="platform-kpi-card" data-testid="tenant-files-total-count">
          <span className="settings-label">Files</span>
          <strong>{files.length}</strong>
          <p>Files currently visible in this tenant context.</p>
        </article>
        <article className="platform-kpi-card" data-testid="tenant-files-upload-policy">
          <span className="settings-label">Upload policy</span>
          <strong>{canUpload ? "Enabled" : "Read only"}</strong>
          <p>Uploads are capped at 2 MB so the starter stays lightweight.</p>
        </article>
      </div>

      {canUpload ? (
        <form className="tenant-files-upload-form" onSubmit={handleUpload} data-testid="tenant-files-upload-form">
          <label htmlFor="tenant-files-input">
            Upload file
            <input
              ref={inputRef}
              id="tenant-files-input"
              name="file"
              type="file"
              data-testid="tenant-files-input"
            />
          </label>
          <button
            type="submit"
            className="billing-payment-button"
            disabled={isUploading}
            data-testid="tenant-files-upload-submit"
          >
            {isUploading ? "Uploading..." : "Upload file"}
          </button>
        </form>
      ) : (
        <div className="tenant-files-readonly-note" data-testid="tenant-files-readonly-note">
          You can review files in this tenant, but only Owner, Admin, and Member roles can upload new ones.
        </div>
      )}

      {message ? (
        <p role="status" className="auth-success" data-testid="tenant-files-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="auth-error" data-testid="tenant-files-error">
          {error}
        </p>
      ) : null}

      <div className="tenant-files-list" data-testid="tenant-files-list">
        {files.length > 0 ? (
          files.map((file) => (
            <article key={file.id} className="tenant-file-row" data-testid={`tenant-file-row-${file.id}`}>
              <div>
                <strong>{file.fileName}</strong>
                <p>{file.mimeType}</p>
              </div>
              <div className="tenant-file-meta">
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>{file.uploadedByEmail}</span>
                <span>{formatTimestamp(file.createdAt)}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="team-empty-state" data-testid="tenant-files-empty-state">
            No files have been uploaded for this tenant yet.
          </div>
        )}
      </div>
    </section>
  );
}
