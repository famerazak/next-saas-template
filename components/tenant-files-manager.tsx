"use client";

import { useRef, useState, type FormEvent } from "react";
import type { TenantFileRecord } from "@/lib/storage/store";

type TenantFilesManagerProps = {
  canManage: boolean;
  downloadUrls: Record<string, string>;
  roleLabel: string;
  tenantName: string;
  initialFiles: TenantFileRecord[];
};

type UploadResponse = {
  downloadUrl?: string;
  error?: string;
  file?: TenantFileRecord;
};

type DeleteResponse = {
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

export function TenantFilesManager({
  canManage,
  downloadUrls,
  roleLabel,
  tenantName,
  initialFiles
}: TenantFilesManagerProps) {
  const [files, setFiles] = useState(initialFiles);
  const [links, setLinks] = useState(downloadUrls);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
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

    if (!response.ok || !payload?.file || !payload.downloadUrl) {
      setError(payload?.error ?? "Upload failed.");
      return;
    }

    const uploadedFile = payload.file;
    const downloadUrl = payload.downloadUrl;

    setFiles((current) => [
      uploadedFile,
      ...current.filter((entry) => entry.id !== uploadedFile.id)
    ]);
    setLinks((current) => ({
      ...current,
      [uploadedFile.id]: downloadUrl
    }));
    setMessage(`${uploadedFile.fileName} uploaded successfully.`);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleDelete(file: TenantFileRecord) {
    setMessage("");
    setError("");
    setDeletingFileId(file.id);

    const response = await fetch("/api/files", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileId: file.id
      })
    });

    const payload = (await response.json().catch(() => null)) as DeleteResponse | null;
    setDeletingFileId(null);

    if (!response.ok || !payload?.file) {
      setError(payload?.error ?? "Delete failed.");
      return;
    }

    const deletedFile = payload.file;
    setFiles((current) => current.filter((entry) => entry.id !== deletedFile.id));
    setLinks((current) => {
      const next = { ...current };
      delete next[deletedFile.id];
      return next;
    });
    setMessage(`${deletedFile.fileName} deleted successfully.`);
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
          <strong>{canManage ? "Enabled" : "Read only"}</strong>
          <p>Uploads and deletes are capped to non-viewer roles so shared files stay controlled.</p>
        </article>
      </div>

      {canManage ? (
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
          You can review files in this tenant, but only Owner, Admin, and Member roles can upload or delete files.
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
              <div className="tenant-file-actions">
                <div className="tenant-file-meta">
                  <span>{formatBytes(file.sizeBytes)}</span>
                  <span>{file.uploadedByEmail}</span>
                  <span>{formatTimestamp(file.createdAt)}</span>
                </div>
                <a
                  href={links[file.id]}
                  className="audit-log-details-button"
                  data-testid={`tenant-file-download-${file.id}`}
                >
                  Download
                </a>
                {canManage ? (
                  <button
                    type="button"
                    className="tenant-file-delete-button"
                    data-testid={`tenant-file-delete-${file.id}`}
                    disabled={deletingFileId === file.id}
                    onClick={() => void handleDelete(file)}
                  >
                    {deletingFileId === file.id ? "Deleting..." : "Delete"}
                  </button>
                ) : null}
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
