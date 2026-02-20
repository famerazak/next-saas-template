import { NextResponse } from "next/server";
import { clearAppSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  clearAppSession(response);
  return response;
}
