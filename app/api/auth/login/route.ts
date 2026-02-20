import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { setAppSession } from "@/lib/auth/session";
import { getSupabaseEnv } from "@/lib/supabase/config";

type LoginRequest = {
  email?: string;
  password?: string;
};

function validateInput(payload: LoginRequest): { email: string; password: string } | null {
  const email = payload.email?.trim();
  const password = payload.password ?? "";
  if (!email || !password) {
    return null;
  }
  return { email, password };
}

export async function POST(request: Request) {
  let body: LoginRequest;
  try {
    body = (await request.json()) as LoginRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = validateInput(body);
  if (!parsed) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (process.env.E2E_AUTH_BYPASS === "1") {
    const response = NextResponse.json(
      { userId: `e2e-${parsed.email}`, redirectTo: "/dashboard" },
      { status: 200 }
    );
    setAppSession(response, { userId: `e2e-${parsed.email}`, email: parsed.email });
    return response;
  }

  let supabaseUrl: string;
  let supabaseAnonKey: string;
  try {
    const env = getSupabaseEnv();
    supabaseUrl = env.url;
    supabaseAnonKey = env.anonKey;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase is not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user?.id || !data.user.email) {
    return NextResponse.json({ error: "Login succeeded but user identity is incomplete." }, { status: 500 });
  }

  const response = NextResponse.json(
    {
      userId: data.user.id,
      redirectTo: "/dashboard"
    },
    { status: 200 }
  );
  setAppSession(response, { userId: data.user.id, email: data.user.email });
  return response;
}
