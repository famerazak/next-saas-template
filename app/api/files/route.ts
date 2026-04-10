import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { canUploadTenantFiles } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { buildSignedDownloadUrl } from "@/lib/storage/signed-download";
import { uploadTenantFileForSession } from "@/lib/storage/store";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

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
