import { createHmac, timingSafeEqual } from "node:crypto";

type SignedDownloadPayload = {
  fileId: string;
  tenantId: string;
  expiresAt: number;
};

const DEFAULT_DOWNLOAD_TTL_SECONDS = 60 * 10;

function getSigningSecret(): string {
  return (
    process.env.FILE_DOWNLOAD_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "local-dev-file-download-secret"
  );
}

function encodePayload(payload: SignedDownloadPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

function decodePayload(value: string): SignedDownloadPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf-8")) as SignedDownloadPayload;
    if (!parsed.fileId || !parsed.tenantId || !Number.isFinite(parsed.expiresAt)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url");
}

export function createSignedDownloadToken(
  input: { fileId: string; tenantId: string },
  options?: { ttlSeconds?: number }
): string {
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_DOWNLOAD_TTL_SECONDS;
  const payload = encodePayload({
    fileId: input.fileId,
    tenantId: input.tenantId,
    expiresAt: Date.now() + ttlSeconds * 1000
  });

  return `${payload}.${sign(payload)}`;
}

export function buildSignedDownloadUrl(
  input: { fileId: string; tenantId: string },
  options?: { ttlSeconds?: number }
): string {
  const token = createSignedDownloadToken(input, options);
  return `/api/files/download?token=${encodeURIComponent(token)}`;
}

export function verifySignedDownloadToken(token: string): SignedDownloadPayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const decoded = decodePayload(payload);
  if (!decoded || decoded.expiresAt < Date.now()) {
    return null;
  }

  return decoded;
}
