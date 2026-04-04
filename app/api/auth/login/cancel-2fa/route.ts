import { NextResponse } from "next/server";
import { clearPreAuthChallenge } from "@/lib/auth/session";
import { buildRedirectUrl } from "@/lib/http/redirect";

export async function POST(request: Request) {
  const response = NextResponse.redirect(buildRedirectUrl(request, "/login"), { status: 303 });
  clearPreAuthChallenge(response);
  return response;
}
