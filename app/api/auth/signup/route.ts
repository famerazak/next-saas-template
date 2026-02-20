import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { setAppSession } from "@/lib/auth/session";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { bootstrapTenantForUser } from "@/lib/tenant/bootstrap";

type SignupRequest = {
  email?: string;
  password?: string;
};

function toTitleCase(value: string): string {
  if (!value) return "Workspace";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveTenantName(email: string): string {
  const [, domain = "workspace.local"] = email.split("@");
  const root = domain.split(".")[0] ?? "workspace";
  return `${toTitleCase(root)} Workspace`;
}

function deriveTenantId(email: string): string {
  const tenantSlug = email
    .toLowerCase()
    .split("@")[1]
    ?.split(".")[0]
    ?.replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `tenant-${tenantSlug || "workspace"}`;
}

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
    const tenantName = deriveTenantName(parsed.email);
    const tenantId = deriveTenantId(parsed.email);
    const role = "Owner";
    const response = NextResponse.json(
      {
        userId,
        email: parsed.email,
        redirectTo: "/dashboard",
        tenantId,
        tenantName,
        role
      },
      { status: 201 }
    );
    setAppSession(response, { userId, email: parsed.email });
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
      role: bootstrap.role
    },
    { status: 201 }
  );
  setAppSession(response, { userId: data.user.id, email: data.user.email });
  return response;
}
