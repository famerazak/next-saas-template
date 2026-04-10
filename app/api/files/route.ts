import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canManageTenantFiles, canUploadTenantFiles } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { buildSignedDownloadUrl } from "@/lib/storage/signed-download";
import { deleteTenantFileForSession, uploadTenantFileForSession } from "@/lib/storage/store";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

type DeleteFileRequest = {
  fileId?: string;
};

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canUploadTenantFiles(session)) {
    return NextResponse.json({ error: "Your role can view tenant files but cannot upload new ones." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload payload must be form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file before uploading." }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "Uploaded file must not be empty." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Uploaded file exceeds the 2 MB starter limit." }, { status: 400 });
  }

  const contentBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const uploaded = await uploadTenantFileForSession(session, {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    contentBase64
  });

  return NextResponse.json(
    {
      file: uploaded,
      downloadUrl: buildSignedDownloadUrl({
        fileId: uploaded.id,
        tenantId: uploaded.tenantId
      })
    },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canManageTenantFiles(session)) {
    return NextResponse.json({ error: "Your role can review files but cannot delete them." }, { status: 403 });
  }

  let body: DeleteFileRequest;
  try {
    body = (await request.json()) as DeleteFileRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const fileId = typeof body.fileId === "string" ? body.fileId.trim() : "";
  if (!fileId) {
    return NextResponse.json({ error: "File id is required." }, { status: 400 });
  }

  try {
    const deleted = await deleteTenantFileForSession(session, fileId);
    await recordTenantAuditEventForSession(session, {
      action: "files.deleted",
      summary: `Deleted ${deleted.fileName} from tenant files.`,
      targetType: "file",
      targetId: deleted.id,
      targetLabel: deleted.fileName,
      metadata: {
        mimeType: deleted.mimeType,
        sizeBytes: deleted.sizeBytes
      }
    });
    return NextResponse.json({ file: deleted }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete file." },
      { status: 400 }
    );
  }
}
