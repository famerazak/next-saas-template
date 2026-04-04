import { NextResponse } from "next/server";
import { canWriteCoreApp } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { saveDashboardNoteForSession } from "@/lib/tenant/settings";

type UpdateDashboardNoteRequest = {
  dashboardNote?: string;
};

function parseDashboardNote(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = value.trim();
  if (parsed.length === 0 || parsed.length > 500) {
    return null;
  }

  return parsed;
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canWriteCoreApp(session)) {
    return NextResponse.json(
      { error: "Your role is read-only in the core app." },
      { status: 403 }
    );
  }

  let body: UpdateDashboardNoteRequest;
  try {
    body = (await request.json()) as UpdateDashboardNoteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const dashboardNote = parseDashboardNote(body.dashboardNote);
  if (!dashboardNote) {
    return NextResponse.json(
      { error: "Dashboard note must be between 1 and 500 characters." },
      { status: 400 }
    );
  }

  const saved = await saveDashboardNoteForSession(session, dashboardNote);
  return NextResponse.json(
    {
      settings: {
        dashboardNote: saved.settings.dashboardNote
      },
      persistence: saved.persistedToDatabase ? "database" : "local"
    },
    { status: 200 }
  );
}
