import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { verifySignedDownloadToken } from "@/lib/storage/signed-download";
import { loadTenantFileForDownload } from "@/lib/storage/store";

function buildDownloadHeaders(fileName: string, mimeType: string, sizeBytes: number) {
  return {
    "Content-Type": mimeType || "application/octet-stream",
    "Content-Length": String(sizeBytes),
    "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
    "Cache-Control": "private, max-age=60"
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing download token.", { status: 400 });
  }

  const payload = verifySignedDownloadToken(token);
  if (!payload) {
    return new NextResponse("Invalid or expired download link.", { status: 403 });
  }

  const file = await loadTenantFileForDownload(payload.tenantId, payload.fileId);
  if (!file) {
    return new NextResponse("File not found for this signed download link.", { status: 404 });
  }

  return new NextResponse(Buffer.from(file.contentBase64, "base64"), {
    status: 200,
    headers: buildDownloadHeaders(file.fileName, file.mimeType, file.sizeBytes)
  });
}
