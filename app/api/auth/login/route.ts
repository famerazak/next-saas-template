import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { setAppSession } from "@/lib/auth/session";
import { loadProfileForUser } from "@/lib/profile/store";
import { getSupabaseEnv } from "@/lib/supabase/config";
import {
  deriveTenantContextFromEmail,
  inferTenantRoleFromEmail,
  resolvePrimaryTenantContextForUser
} from "@/lib/tenant/context";

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
    const tenant = deriveTenantContextFromEmail(parsed.email, inferTenantRoleFromEmail(parsed.email));
    const response = NextResponse.json(
      {
        userId: `e2e-${parsed.email}`,
        redirectTo: "/dashboard",
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        role: tenant.role
      },
      { status: 200 }
    );
    setAppSession(response, {
      userId: `e2e-${parsed.email}`,
      email: parsed.email,
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      role: tenant.role
    });
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

  let tenant;
  try {
    tenant = await resolvePrimaryTenantContextForUser({
      userId: data.user.id,
      email: data.user.email,
      supabaseUrl,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  } catch (tenantError) {
    return NextResponse.json(
      {
        error:
          tenantError instanceof Error
            ? tenantError.message
            : "Login succeeded, but tenant context could not be resolved."
      },
      { status: 500 }
    );
  }

  const profile = await loadProfileForUser(data.user.id);

  const response = NextResponse.json(
    {
      userId: data.user.id,
      redirectTo: "/dashboard",
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      role: tenant.role,
      fullName: profile?.fullName ?? "",
      jobTitle: profile?.jobTitle ?? ""
    },
    { status: 200 }
  );
  setAppSession(response, {
    userId: data.user.id,
    email: data.user.email,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    role: tenant.role,
    fullName: profile?.fullName ?? "",
    jobTitle: profile?.jobTitle ?? ""
  });
  return response;
}
