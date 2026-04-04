import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeProviderAuthAbuse } from "@/lib/auth/abuse";
import { createActiveSession } from "@/lib/auth/session-registry";
import { clearPreAuthChallenge, setAppSession } from "@/lib/auth/session";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { bootstrapTenantForUser } from "@/lib/tenant/bootstrap";
import { deriveTenantContextFromEmail } from "@/lib/tenant/context";

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

  if (process.env.E2E_AUTH_BYPASS === "1") {
    const userId = `e2e-${parsed.email}`;
    const tenant = deriveTenantContextFromEmail(parsed.email, "Owner");
    const sessionPayload = {
      userId,
      email: parsed.email,
      sessionId: randomUUID(),
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      role: tenant.role,
      fullName: "",
      jobTitle: ""
    };
    const response = NextResponse.json(
      {
        userId,
        email: parsed.email,
        redirectTo: "/dashboard",
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        role: tenant.role,
        fullName: "",
        jobTitle: ""
      },
      { status: 201 }
    );
    await createActiveSession(sessionPayload, request.headers.get("user-agent"));
    setAppSession(response, sessionPayload);
    clearPreAuthChallenge(response);
    return response;
  }

  let supabaseUrl: string;
  let supabaseAnonKey: string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    const normalized = normalizeProviderAuthAbuse(error);
    if (normalized) {
      return NextResponse.json(normalized, {
        status: normalized.code === "captcha_required" ? 403 : 429,
        headers: normalized.retryAfterSeconds
          ? { "Retry-After": String(normalized.retryAfterSeconds) }
          : undefined
      });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user?.id || !data.user.email) {
    return NextResponse.json(
      { error: "Signup succeeded but user identity is incomplete." },
      { status: 500 }
    );
  }

  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Account created, but tenant bootstrap is not configured. Set SUPABASE_SERVICE_ROLE_KEY."
      },
      { status: 500 }
    );
  }

  let bootstrap;
  try {
    bootstrap = await bootstrapTenantForUser({
      userId: data.user.id,
      email: data.user.email,
      supabaseUrl,
      serviceRoleKey
    });
  } catch (bootstrapError) {
    return NextResponse.json(
      {
        error:
          bootstrapError instanceof Error
            ? bootstrapError.message
            : "Account created, but tenant bootstrap failed."
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json(
    {
      userId: data.user.id,
      email: data.user.email,
      redirectTo: "/dashboard",
      tenantId: bootstrap.tenantId,
      tenantName: bootstrap.tenantName,
      role: bootstrap.role,
      fullName: "",
      jobTitle: ""
    },
    { status: 201 }
  );
  const sessionPayload = {
    userId: data.user.id,
    email: data.user.email,
    sessionId: randomUUID(),
    tenantId: bootstrap.tenantId,
    tenantName: bootstrap.tenantName,
    role: bootstrap.role,
    fullName: "",
    jobTitle: ""
  };
  await createActiveSession(sessionPayload, request.headers.get("user-agent"));
  setAppSession(response, sessionPayload);
  clearPreAuthChallenge(response);
  return response;
}
