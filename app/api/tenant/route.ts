import { NextResponse } from "next/server";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies, setAppSession } from "@/lib/auth/session";
import { saveTenantNameForSession } from "@/lib/tenant/settings";

type UpdateTenantRequest = {
  tenantName?: string;
};

function parseTenantName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = value.trim();
  if (!parsed || parsed.length > 80) {
    return null;
  }
  return parsed;
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!canAccessTenantAdminArea(session)) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  let body: UpdateTenantRequest;
  try {
    body = (await request.json()) as UpdateTenantRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const tenantName = parseTenantName(body.tenantName);
  if (!tenantName) {
    return NextResponse.json(
      { error: "Tenant name is required and must be 80 characters or fewer." },
      { status: 400 }
    );
  }

  const saved = await saveTenantNameForSession(session, tenantName);
  const response = NextResponse.json(
    {
      settings: {
        tenantName: saved.settings.tenantName
      },
      persistence: saved.persistedToDatabase ? "database+session" : "session"
    },
    { status: 200 }
  );

  setAppSession(response, {
    ...session,
    tenantName: saved.settings.tenantName
  });

  return response;
}
