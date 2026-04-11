export type RateLimitPayload = {
  code: "rate_limited";
  error: string;
  retryAfterSeconds: number;
  hint?: string;
};

type RateLimitRecord = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

type RateLimitStore = Map<string, RateLimitRecord>;

type RateLimitPolicy = {
  maxAttempts: number;
  windowMs: number;
  cooldownMs: number;
  actionLabel: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __genericRateLimitStore: RateLimitStore | undefined;
}

function getStore(): RateLimitStore {
  if (!globalThis.__genericRateLimitStore) {
    globalThis.__genericRateLimitStore = new Map<string, RateLimitRecord>();
  }

  return globalThis.__genericRateLimitStore;
}

function normalizeKey(scope: string, identifier: string) {
  return `${scope}:${identifier.toLowerCase()}`;
}

function getRecord(key: string, windowMs: number): RateLimitRecord {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing) {
    const created: RateLimitRecord = {
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
    const reset: RateLimitRecord = {
      count: 0,
      firstAttemptAt: now,
      blockedUntil: null
    };
    store.set(key, reset);
    return reset;
  }

  return existing;
}

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function formatRetryWindow(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function buildRateLimitedPayload(actionLabel: string, retryAfterSeconds: number): RateLimitPayload {
  return {
    code: "rate_limited",
    retryAfterSeconds,
    error: `Too many ${actionLabel.toLowerCase()} attempts. Try again in ${formatRetryWindow(retryAfterSeconds)}.`,
    hint: `Wait for the cooldown to finish before trying ${actionLabel.toLowerCase()} again.`
  };
}

export function consumeRateLimit(scope: string, identifier: string, policy: RateLimitPolicy): RateLimitPayload | null {
  const key = normalizeKey(scope, identifier);
  const record = getRecord(key, policy.windowMs);
  const now = Date.now();

  if (record.blockedUntil && record.blockedUntil > now) {
    return buildRateLimitedPayload(policy.actionLabel, Math.ceil((record.blockedUntil - now) / 1000));
  }

  record.count += 1;
  if (record.count > policy.maxAttempts) {
    record.blockedUntil = now + policy.cooldownMs;
    getStore().set(key, record);
    return buildRateLimitedPayload(policy.actionLabel, Math.ceil(policy.cooldownMs / 1000));
  }

  getStore().set(key, record);
  return null;
}

export function formatRateLimitMessage(
  payload: Partial<RateLimitPayload> & { error?: string },
  fallback: string
): string {
  if (payload.code === "rate_limited") {
    if (typeof payload.retryAfterSeconds === "number") {
      return `Too many attempts. Try again in ${formatRetryWindow(payload.retryAfterSeconds)}.`;
    }

    return payload.error || "Too many attempts. Please wait a moment before trying again.";
  }

  return payload.error || fallback;
}
