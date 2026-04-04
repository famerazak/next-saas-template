import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { TenantRole } from "@/lib/tenant/context";

export const APP_SESSION_COOKIE = "app_session";
export const PRE_AUTH_CHALLENGE_COOKIE = "app_pre_auth";

export type AppSession = {
  userId: string;
  email: string;
  sessionId?: string;
  tenantId?: string;
  tenantName?: string;
  role?: TenantRole;
  fullName?: string;
  jobTitle?: string;
};

export type PreAuthChallengeSession = AppSession & {
  passwordVerifiedAt: string;
};

function encodeSession(session: AppSession | PreAuthChallengeSession): string {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

function decodeSession(value: string): AppSession | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf-8")) as AppSession;
    if (!parsed.userId || !parsed.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function decodePreAuthChallenge(value: string): PreAuthChallengeSession | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf-8")) as PreAuthChallengeSession;
    if (!parsed.userId || !parsed.email || !parsed.passwordVerifiedAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setAppSession(response: NextResponse, session: AppSession) {
  response.cookies.set({
    name: APP_SESSION_COOKIE,
    value: encodeSession(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function setPreAuthChallenge(response: NextResponse, session: PreAuthChallengeSession) {
  response.cookies.set({
    name: PRE_AUTH_CHALLENGE_COOKIE,
    value: encodeSession(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10
  });
}

export function clearAppSession(response: NextResponse) {
  response.cookies.set({
    name: APP_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function clearPreAuthChallenge(response: NextResponse) {
  response.cookies.set({
    name: PRE_AUTH_CHALLENGE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function getAppSessionFromCookies(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  const session = decodeSession(raw);
  if (!session) {
    return null;
  }

  if (!session.sessionId) {
    return session;
  }

  const { touchActiveSession } = await import("@/lib/auth/session-registry");
  const active = await touchActiveSession(session.userId, session.sessionId);
  return active ? session : null;
}

export async function getPreAuthChallengeFromCookies(): Promise<PreAuthChallengeSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PRE_AUTH_CHALLENGE_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  return decodePreAuthChallenge(raw);
}
