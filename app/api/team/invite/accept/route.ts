import { NextResponse } from "next/server";
import { getAppSessionFromCookies, setAppSession } from "@/lib/auth/session";
import { buildRedirectUrl } from "@/lib/http/redirect";
import { acceptInviteForSession } from "@/lib/team/invites";

type AcceptInviteRequest = {
  inviteId?: string;
};

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return redirectForRequest(request, "/login", "Authentication required.", 401);
  }

  const body = await parseRequestBody(request);
  if (body === null) {
    return redirectForRequest(request, "/dashboard", "Invalid request payload.", 400);
  }

  if (!body.inviteId) {
    return redirectForRequest(request, "/dashboard", "Invite ID is required.", 400);
  }

  try {
    const accepted = await acceptInviteForSession(session, body.inviteId);
    const response = wantsJson(request)
      ? NextResponse.json(
          {
            invite: accepted.invite,
            tenant: accepted.tenantContext,
            persistence: accepted.persistedToDatabase ? "database+session" : "local+session"
          },
          { status: 200 }
        )
      : NextResponse.redirect(buildRedirectUrl(request, "/dashboard?inviteAccepted=1"), 303);

    setAppSession(response, {
      ...session,
      tenantId: accepted.tenantContext.tenantId,
      tenantName: accepted.tenantContext.tenantName,
      role: accepted.tenantContext.role
    });

    return response;
  } catch (error) {
    return redirectForRequest(
      request,
      "/dashboard",
      error instanceof Error ? error.message : "Could not accept invite.",
      400
    );
  }
}

async function parseRequestBody(request: Request): Promise<AcceptInviteRequest | null> {
  if (wantsJson(request)) {
    try {
      return (await request.json()) as AcceptInviteRequest;
    } catch {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    return {
      inviteId: String(formData.get("inviteId") ?? "").trim()
    };
  } catch {
    return null;
  }
}

function wantsJson(request: Request): boolean {
  return request.headers.get("content-type")?.includes("application/json") ?? false;
}

function redirectForRequest(request: Request, pathname: string, message: string, status: number) {
  if (wantsJson(request)) {
    return NextResponse.json({ error: message }, { status });
  }

  const url = buildRedirectUrl(request, pathname);
  if (pathname === "/dashboard") {
    url.searchParams.set("inviteError", message);
  }

  return NextResponse.redirect(url, 303);
}
