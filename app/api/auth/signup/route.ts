import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/config";

type SignupRequest = {
  email?: string;
  password?: string;
};

function validateInput(payload: SignupRequest): { email: string; password: string } | null {
  const email = payload.email?.trim();
  const password = payload.password ?? "";
  if (!email || !password) {
    return null;
  }
  if (password.length < 8) {
    return null;
  }
  return { email, password };
}

export async function POST(request: Request) {
  let body: SignupRequest;
  try {
    body = (await request.json()) as SignupRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = validateInput(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "Provide a valid email and a password with at least 8 characters." },
      { status: 400 }
    );
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

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      userId: data.user?.id ?? null,
      redirectTo: "/dashboard"
    },
    { status: 201 }
  );
}
