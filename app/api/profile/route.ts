import { NextResponse } from "next/server";
import { getAppSessionFromCookies, setAppSession } from "@/lib/auth/session";
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
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: UpdateProfileRequest;
  try {
    body = (await request.json()) as UpdateProfileRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const fullName = parseField(body.fullName, 80);
  const jobTitle = parseField(body.jobTitle, 80);
  if (fullName === null || jobTitle === null) {
    return NextResponse.json(
      { error: "Profile fields must be 80 characters or fewer." },
      { status: 400 }
    );
  }

  const saved = await saveProfileForUser(session.userId, {
    fullName: fullName ?? "",
    jobTitle: jobTitle ?? ""
  });

  const response = NextResponse.json(
    {
      profile: saved.profile,
      persistence: saved.persistedToDatabase ? "database+session" : "session"
    },
    { status: 200 }
  );

  setAppSession(response, {
    ...session,
    fullName: saved.profile.fullName,
    jobTitle: saved.profile.jobTitle
  });

  return response;
}
