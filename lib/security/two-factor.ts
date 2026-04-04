import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { buildOtpAuthUri, formatTotpSecret, generateTotpSecret, maskTotpSecret, verifyTotpToken } from "@/lib/security/totp";

const APP_ISSUER = "Next SaaS Template";

export type TwoFactorState = {
  userId: string;
  email: string;
  isEnabled: boolean;
  maskedSecret: string | null;
  enrolledAt: string | null;
  pendingSecret: string | null;
  pendingQrCodeDataUrl: string | null;
  pendingOtpAuthUri: string | null;
  pendingStartedAt: string | null;
};

type TwoFactorRecord = {
  email: string;
  enabledSecret: string | null;
  enabledAt: string | null;
  pendingSecret: string | null;
  pendingStartedAt: string | null;
};

type TwoFactorRow = {
  user_id: string;
  email: string | null;
  totp_secret: string | null;
  enabled_at: string | null;
  pending_secret: string | null;
  pending_started_at: string | null;
};

type LocalTwoFactorStore = Map<string, TwoFactorRecord>;

declare global {
  // eslint-disable-next-line no-var
  var __localTwoFactorStore: LocalTwoFactorStore | undefined;
}

function getLocalTwoFactorStore(): LocalTwoFactorStore {
  if (!globalThis.__localTwoFactorStore) {
    globalThis.__localTwoFactorStore = new Map<string, TwoFactorRecord>();
  }

  return globalThis.__localTwoFactorStore;
}

function getServiceClient() {
  if (process.env.E2E_AUTH_BYPASS === "1") {
    return null;
  }

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

function normalizeRecord(userId: string, email: string, record?: Partial<TwoFactorRecord> | null): TwoFactorRecord {
  return {
    email,
    enabledSecret: record?.enabledSecret ?? null,
    enabledAt: record?.enabledAt ?? null,
    pendingSecret: record?.pendingSecret ?? null,
    pendingStartedAt: record?.pendingStartedAt ?? null
  };
}

function buildState(userId: string, email: string, record?: Partial<TwoFactorRecord> | null): TwoFactorState {
  const normalized = normalizeRecord(userId, email, record);

  return {
    userId,
    email: normalized.email,
    isEnabled: Boolean(normalized.enabledSecret),
    maskedSecret: normalized.enabledSecret ? maskTotpSecret(normalized.enabledSecret) : null,
    enrolledAt: normalized.enabledAt,
    pendingSecret: normalized.pendingSecret ? formatTotpSecret(normalized.pendingSecret) : null,
    pendingQrCodeDataUrl: null,
    pendingOtpAuthUri: normalized.pendingSecret
      ? buildOtpAuthUri({
          issuer: APP_ISSUER,
          accountName: normalized.email,
          secret: normalized.pendingSecret
        })
      : null,
    pendingStartedAt: normalized.pendingStartedAt
  };
}

function readLocalRecord(userId: string, email: string): TwoFactorRecord {
  return normalizeRecord(userId, email, getLocalTwoFactorStore().get(userId));
}

function writeLocalRecord(userId: string, email: string, record: Partial<TwoFactorRecord>): TwoFactorRecord {
  const next = normalizeRecord(userId, email, {
    ...getLocalTwoFactorStore().get(userId),
    ...record,
    email
  });
  getLocalTwoFactorStore().set(userId, next);
  return next;
}

async function hydrateQrCode(state: TwoFactorState): Promise<TwoFactorState> {
  if (!state.pendingOtpAuthUri) {
    return state;
  }

  const pendingQrCodeDataUrl = await QRCode.toDataURL(state.pendingOtpAuthUri, {
    margin: 1,
    width: 220,
    color: {
      dark: "#112338",
      light: "#FFFFFF"
    }
  });

  return {
    ...state,
    pendingQrCodeDataUrl
  };
}

export async function loadTwoFactorStateForUser(userId: string, email: string): Promise<TwoFactorState> {
  const supabase = getServiceClient();
  if (!supabase) {
    return buildState(userId, email, readLocalRecord(userId, email));
  }

  const { data, error } = await supabase
    .from("user_two_factor_factors")
    .select("user_id, email, totp_secret, enabled_at, pending_secret, pending_started_at")
    .eq("user_id", userId)
    .maybeSingle<TwoFactorRow>();

  if (error || !data) {
    return buildState(userId, email, readLocalRecord(userId, email));
  }

  return buildState(userId, email, {
    email: data.email ?? email,
    enabledSecret: data.totp_secret,
    enabledAt: data.enabled_at,
    pendingSecret: data.pending_secret,
    pendingStartedAt: data.pending_started_at
  });
}

export async function isTwoFactorEnabledForUser(userId: string, email: string): Promise<boolean> {
  const state = await loadTwoFactorStateForUser(userId, email);
  return state.isEnabled;
}

export async function startTwoFactorEnrollmentForUser(userId: string, email: string): Promise<TwoFactorState> {
  const currentState = await loadTwoFactorStateForUser(userId, email);
  if (currentState.isEnabled) {
    return currentState;
  }

  const rawSecret = currentState.pendingSecret?.replace(/\s+/g, "") ?? generateTotpSecret();
  const pendingStartedAt = currentState.pendingStartedAt ?? new Date().toISOString();
  const pendingOtpAuthUri = buildOtpAuthUri({
    issuer: APP_ISSUER,
    accountName: email,
    secret: rawSecret
  });

  const nextStateBase: TwoFactorState = {
    ...currentState,
    email,
    pendingSecret: formatTotpSecret(rawSecret),
    pendingOtpAuthUri,
    pendingStartedAt
  };

  const supabase = getServiceClient();
  if (supabase) {
    const { error } = await supabase.from("user_two_factor_factors").upsert(
      {
        user_id: userId,
        email,
        pending_secret: rawSecret,
        pending_started_at: pendingStartedAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

    if (!error) {
      return hydrateQrCode(nextStateBase);
    }
  }

  writeLocalRecord(userId, email, {
    pendingSecret: rawSecret,
    pendingStartedAt
  });

  return hydrateQrCode(nextStateBase);
}

export async function completeTwoFactorEnrollmentForUser(
  userId: string,
  email: string,
  token: string
): Promise<TwoFactorState> {
  const currentState = await loadTwoFactorStateForUser(userId, email);
  const rawSecret = currentState.pendingSecret?.replace(/\s+/g, "");

  if (!rawSecret) {
    throw new Error("Start 2FA setup before verifying a code.");
  }

  if (!verifyTotpToken({ secret: rawSecret, token })) {
    throw new Error("Verification code is invalid. Try the latest code from your authenticator app.");
  }

  const enabledAt = new Date().toISOString();
  const supabase = getServiceClient();
  if (supabase) {
    const { error } = await supabase.from("user_two_factor_factors").upsert(
      {
        user_id: userId,
        email,
        totp_secret: rawSecret,
        enabled_at: enabledAt,
        pending_secret: null,
        pending_started_at: null,
        updated_at: enabledAt
      },
      { onConflict: "user_id" }
    );

    if (!error) {
      return buildState(userId, email, {
        email,
        enabledSecret: rawSecret,
        enabledAt,
        pendingSecret: null,
        pendingStartedAt: null
      });
    }
  }

  writeLocalRecord(userId, email, {
    email,
    enabledSecret: rawSecret,
    enabledAt,
    pendingSecret: null,
    pendingStartedAt: null
  });

  return buildState(userId, email, {
    email,
    enabledSecret: rawSecret,
    enabledAt,
    pendingSecret: null,
    pendingStartedAt: null
  });
}

export async function verifyTwoFactorChallengeForUser(
  userId: string,
  email: string,
  token: string
): Promise<TwoFactorState> {
  const currentState = await loadTwoFactorStateForUser(userId, email);
  const supabase = getServiceClient();
  let secret: string | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("user_two_factor_factors")
      .select("totp_secret")
      .eq("user_id", userId)
      .maybeSingle<{ totp_secret: string | null }>();
    secret = data?.totp_secret ?? null;
  }

  if (!supabase) {
    secret = readLocalRecord(userId, email).enabledSecret;
  }

  if (!currentState.isEnabled || !secret) {
    throw new Error("No enrolled 2FA factor exists for this account.");
  }

  if (!verifyTotpToken({ secret, token })) {
    throw new Error("Verification code is invalid. Try the latest code from your authenticator app.");
  }

  return currentState;
}
