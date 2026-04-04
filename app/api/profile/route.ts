import { NextResponse } from "next/server";
import { getAppSessionFromCookies, setAppSession } from "@/lib/auth/session";
import { buildRedirectUrl } from "@/lib/http/redirect";
import { saveProfileForUser } from "@/lib/profile/store";

type UpdateProfileRequest = {
  fullName?: string;
  jobTitle?: string;
};

function parseField(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return "";
  }
  const parsed = value.trim();
  if (parsed.length > maxLength) {
    return null;
  }
  return parsed;
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return redirectForRequest(request, "Authentication required.", 401);
  }

  const body = await parseRequestBody(request);
  if (body === null) {
    return redirectForRequest(request, "Invalid request payload.", 400);
  }

  const fullName = parseField(body.fullName, 80);
  const jobTitle = parseField(body.jobTitle, 80);
  if (fullName === null || jobTitle === null) {
    return redirectForRequest(request, "Profile fields must be 80 characters or fewer.", 400);
  }

  const saved = await saveProfileForUser(session.userId, {
    fullName: fullName ?? "",
    jobTitle: jobTitle ?? ""
  });

  const response = wantsJson(request)
    ? NextResponse.json(
        {
          profile: saved.profile,
          persistence: saved.persistedToDatabase ? "database+session" : "session"
        },
        { status: 200 }
      )
    : NextResponse.redirect(buildRedirectUrl(request, "/settings/profile?profileSaved=1"), 303);

  setAppSession(response, {
    ...session,
    fullName: saved.profile.fullName,
    jobTitle: saved.profile.jobTitle
  });

  return response;
}

async function parseRequestBody(request: Request): Promise<UpdateProfileRequest | null> {
  if (wantsJson(request)) {
    try {
      return (await request.json()) as UpdateProfileRequest;
    } catch {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    return {
      fullName: String(formData.get("fullName") ?? ""),
      jobTitle: String(formData.get("jobTitle") ?? "")
    };
  } catch {
    return null;
  }
}

function wantsJson(request: Request): boolean {
  return request.headers.get("content-type")?.includes("application/json") ?? false;
}

function redirectForRequest(request: Request, message: string, status: number) {
  if (wantsJson(request)) {
    return NextResponse.json({ error: message }, { status });
  }

  const url = buildRedirectUrl(request, "/settings/profile");
  url.searchParams.set("profileError", message);
  return NextResponse.redirect(url, 303);
}
