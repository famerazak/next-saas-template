import { createHmac, randomBytes } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_DIGITS = 6;
const DEFAULT_PERIOD = 30;

function normalizeBase32(value: string): string {
  return value.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

export function encodeBase32(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(secret: string): Buffer {
  const normalized = normalizeBase32(secret);
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      continue;
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

export function generateTotpSecret(length = 20): string {
  return encodeBase32(randomBytes(length));
}

export function formatTotpSecret(secret: string): string {
  return normalizeBase32(secret)
    .match(/.{1,4}/g)
    ?.join(" ") ?? normalizeBase32(secret);
}

export function maskTotpSecret(secret: string): string {
  const normalized = normalizeBase32(secret);
  if (normalized.length <= 8) {
    return normalized;
  }

  return `${normalized.slice(0, 4)} •••• ${normalized.slice(-4)}`;
}

export function buildOtpAuthUri({
  issuer,
  accountName,
  secret,
  digits = DEFAULT_DIGITS,
  period = DEFAULT_PERIOD
}: {
  issuer: string;
  accountName: string;
  secret: string;
  digits?: number;
  period?: number;
}): string {
  const label = `${issuer}:${accountName}`;
  const params = new URLSearchParams({
    secret: normalizeBase32(secret),
    issuer,
    algorithm: "SHA1",
    digits: String(digits),
    period: String(period)
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

function generateHotp(secret: string, counter: number, digits = DEFAULT_DIGITS): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const code =
    ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);

  return String(code % 10 ** digits).padStart(digits, "0");
}

export function generateTotpToken(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / DEFAULT_PERIOD);
  return generateHotp(secret, counter, DEFAULT_DIGITS);
}

export function verifyTotpToken({
  secret,
  token,
  timestamp = Date.now(),
  window = 1
}: {
  secret: string;
  token: string;
  timestamp?: number;
  window?: number;
}): boolean {
  const normalizedToken = token.trim();
  if (!/^\d{6}$/.test(normalizedToken)) {
    return false;
  }

  const counter = Math.floor(timestamp / 1000 / DEFAULT_PERIOD);
  for (let offset = -window; offset <= window; offset += 1) {
    if (generateHotp(secret, counter + offset, DEFAULT_DIGITS) === normalizedToken) {
      return true;
    }
  }

  return false;
}
