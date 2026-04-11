import { buildRateLimitedPayload, formatRateLimitMessage as formatGenericRateLimitMessage, getRequestIp } from "@/lib/rate-limit";

export type AuthAbuseCode = "rate_limited" | "captcha_required";

export type AuthAbusePayload = {
  error: string;
  code: AuthAbuseCode;
  retryAfterSeconds?: number;
  hint?: string;
};

type AbuseRecord = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

type AbuseStore = Map<string, AbuseRecord>;

declare global {
  // eslint-disable-next-line no-var
  var __authAbuseStore: AbuseStore | undefined;
}

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_COOLDOWN_MS = 10 * 60 * 1000;

function getStore(): AbuseStore {
  if (!globalThis.__authAbuseStore) {
    globalThis.__authAbuseStore = new Map<string, AbuseRecord>();
  }

  return globalThis.__authAbuseStore;
}

function normalizeKey(scope: string, identifier: string) {
  return `${scope}:${identifier.toLowerCase()}`;
}

function getRecord(key: string, windowMs: number): AbuseRecord {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing) {
    const created: AbuseRecord = {
      count: 0,
      firstAttemptAt: now,
      blockedUntil: null
    };
    store.set(key, created);
    return created;
  }

  if (existing.blockedUntil && existing.blockedUntil > now) {
    return existing;
  }

  if (now - existing.firstAttemptAt > windowMs) {
    const reset: AbuseRecord = {
      count: 0,
      firstAttemptAt: now,
      blockedUntil: null
    };
    store.set(key, reset);
    return reset;
  }

  return existing;
}

export function checkLoginAbuse(identifier: string): AuthAbusePayload | null {
  const key = normalizeKey("login", identifier);
  const record = getRecord(key, LOGIN_WINDOW_MS);
  const now = Date.now();

  if (!record.blockedUntil || record.blockedUntil <= now) {
    return null;
  }

  return buildAuthRateLimitedPayload(Math.ceil((record.blockedUntil - now) / 1000));
}

export function recordFailedLogin(identifier: string): AuthAbusePayload | null {
  const key = normalizeKey("login", identifier);
  const record = getRecord(key, LOGIN_WINDOW_MS);
  const now = Date.now();

  if (record.blockedUntil && record.blockedUntil > now) {
    return buildAuthRateLimitedPayload(Math.ceil((record.blockedUntil - now) / 1000));
  }

  record.count += 1;
  if (record.count >= LOGIN_MAX_FAILURES) {
    record.blockedUntil = now + LOGIN_COOLDOWN_MS;
    return buildAuthRateLimitedPayload(Math.ceil(LOGIN_COOLDOWN_MS / 1000));
  }

  getStore().set(key, record);
  return null;
}

export function clearFailedLogins(identifier: string) {
  getStore().delete(normalizeKey("login", identifier));
}

export function buildAuthRateLimitedPayload(retryAfterSeconds: number): AuthAbusePayload {
  return {
    code: "rate_limited",
    retryAfterSeconds,
    error: `Too many sign-in attempts. Try again in ${formatRetryWindow(retryAfterSeconds)}.`,
    hint: "Wait for the cooldown to finish before trying again."
  };
}

export function normalizeProviderAuthAbuse(error: {
  message?: string | null;
  status?: number;
  code?: string | null;
}): AuthAbusePayload | null {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";

  if (error.status === 429 || message.includes("rate limit") || message.includes("too many")) {
    return buildAuthRateLimitedPayload(600);
  }

  if (
    code.includes("captcha") ||
    message.includes("captcha") ||
    message.includes("additional verification")
  ) {
    return {
      code: "captcha_required",
      error: "We need an extra verification step before you can continue.",
      hint: "Refresh the page and complete the verification step before trying again."
    };
  }

  return null;
}

export function formatAuthAbuseMessage(
  payload: Partial<AuthAbusePayload> & { error?: string },
  fallback: string
): string {
  if (payload.code === "rate_limited") {
    return formatGenericRateLimitMessage(
      {
        code: "rate_limited",
        error: payload.error,
        retryAfterSeconds: payload.retryAfterSeconds
      },
      fallback
    );
  }

  if (payload.code === "captcha_required") {
    return payload.hint
      ? `${payload.error || "We need an extra verification step before you can continue."} ${payload.hint}`
      : payload.error || "We need an extra verification step before you can continue.";
  }

  return payload.error || fallback;
}

function formatRetryWindow(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
