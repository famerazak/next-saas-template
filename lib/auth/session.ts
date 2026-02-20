import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { TenantRole } from "@/lib/tenant/context";

export const APP_SESSION_COOKIE = "app_session";

export type AppSession = {
  userId: string;
  email: string;
  tenantId?: string;
  tenantName?: string;
  role?: TenantRole;
};

function encodeSession(session: AppSession): string {
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

export async function getAppSessionFromCookies(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  return decodeSession(raw);
}
