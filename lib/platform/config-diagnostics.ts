export type PlatformConfigStatus = "Healthy" | "Needs attention" | "Starter mode";

export type PlatformConfigDiagnostic = {
  id: string;
  label: string;
  status: PlatformConfigStatus;
  summary: string;
  operatorAction: string;
  envVars: string[];
};

export type PlatformConfigDiagnosticsSnapshot = {
  checks: PlatformConfigDiagnostic[];
  issueCount: number;
  starterModeCount: number;
  healthyCount: number;
};

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function buildDiagnostic(input: PlatformConfigDiagnostic): PlatformConfigDiagnostic {
  return input;
}

export function loadPlatformConfigDiagnosticsSnapshot(): PlatformConfigDiagnosticsSnapshot {
  const e2eBypassEnabled = process.env.E2E_AUTH_BYPASS === "1";
  const hasSupabaseUrl = hasValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = hasValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRoleKey = hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasGaMeasurementId = hasValue(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  const hasStripeWebhookSecret = hasValue(process.env.STRIPE_WEBHOOK_SECRET);
  const hasFileDownloadSigningSecret = hasValue(process.env.FILE_DOWNLOAD_SIGNING_SECRET);

  const checks: PlatformConfigDiagnostic[] = [
    buildDiagnostic({
      id: "runtime-mode",
      label: "Runtime mode",
      status: e2eBypassEnabled ? "Starter mode" : "Healthy",
      summary: e2eBypassEnabled
        ? "E2E auth bypass is active, so auth/bootstrap flows are running in starter mode instead of hitting Supabase directly."
        : "Production-style runtime mode is active for auth and bootstrap flows.",
      operatorAction: e2eBypassEnabled
        ? "Disable E2E_AUTH_BYPASS when you want to validate real provider-backed auth and tenant bootstrap."
        : "No action needed.",
      envVars: ["E2E_AUTH_BYPASS"]
    }),
    buildDiagnostic({
      id: "supabase-public-auth",
      label: "Supabase public auth",
      status: e2eBypassEnabled ? "Starter mode" : hasSupabaseUrl && hasSupabaseAnonKey ? "Healthy" : "Needs attention",
      summary: e2eBypassEnabled
        ? "Public Supabase auth keys are bypassed in starter mode."
        : hasSupabaseUrl && hasSupabaseAnonKey
          ? "Public auth env vars are configured for login and signup flows."
          : "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for real login and signup flows.",
      operatorAction: e2eBypassEnabled
        ? "Configure the public Supabase env vars before disabling starter mode."
        : hasSupabaseUrl && hasSupabaseAnonKey
          ? "No action needed."
          : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the runtime environment.",
      envVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    }),
    buildDiagnostic({
      id: "supabase-service-role",
      label: "Supabase service role",
      status: e2eBypassEnabled ? "Starter mode" : hasServiceRoleKey ? "Healthy" : "Needs attention",
      summary: e2eBypassEnabled
        ? "Tenant bootstrap and server-side Supabase writes are bypassed in starter mode."
        : hasServiceRoleKey
          ? "Service-role access is configured for tenant bootstrap and privileged server operations."
          : "SUPABASE_SERVICE_ROLE_KEY is required for tenant bootstrap and privileged server operations.",
      operatorAction: e2eBypassEnabled
        ? "Set SUPABASE_SERVICE_ROLE_KEY before moving out of starter mode."
        : hasServiceRoleKey
          ? "No action needed."
          : "Add SUPABASE_SERVICE_ROLE_KEY to the server runtime before shipping real tenant bootstrap or storage flows.",
      envVars: ["SUPABASE_SERVICE_ROLE_KEY"]
    }),
    buildDiagnostic({
      id: "ga-measurement-id",
      label: "Google Analytics measurement id",
      status: hasGaMeasurementId ? "Healthy" : "Needs attention",
      summary: hasGaMeasurementId
        ? "Consent-gated analytics can boot with the configured GA measurement id."
        : "Analytics consent UX is in place, but GA will stay inert until NEXT_PUBLIC_GA_MEASUREMENT_ID is configured.",
      operatorAction: hasGaMeasurementId
        ? "No action needed."
        : "Add NEXT_PUBLIC_GA_MEASUREMENT_ID when you want live analytics beyond starter mode.",
      envVars: ["NEXT_PUBLIC_GA_MEASUREMENT_ID"]
    }),
    buildDiagnostic({
      id: "stripe-webhook-secret",
      label: "Stripe webhook secret",
      status: hasStripeWebhookSecret ? "Healthy" : "Needs attention",
      summary: hasStripeWebhookSecret
        ? "Webhook verification is using a configured Stripe signing secret."
        : "Webhook flows fall back to the starter signing secret until STRIPE_WEBHOOK_SECRET is configured.",
      operatorAction: hasStripeWebhookSecret
        ? "No action needed."
        : "Set STRIPE_WEBHOOK_SECRET before connecting live Stripe webhooks.",
      envVars: ["STRIPE_WEBHOOK_SECRET"]
    }),
    buildDiagnostic({
      id: "file-download-signing",
      label: "File download signing",
      status: hasFileDownloadSigningSecret || hasServiceRoleKey ? "Healthy" : e2eBypassEnabled ? "Starter mode" : "Needs attention",
      summary:
        hasFileDownloadSigningSecret || hasServiceRoleKey
          ? "Signed file downloads have a server-side signing secret available."
          : e2eBypassEnabled
            ? "Signed file downloads work in starter mode, but production should use FILE_DOWNLOAD_SIGNING_SECRET or SUPABASE_SERVICE_ROLE_KEY."
            : "Signed file downloads need FILE_DOWNLOAD_SIGNING_SECRET or SUPABASE_SERVICE_ROLE_KEY.",
      operatorAction:
        hasFileDownloadSigningSecret || hasServiceRoleKey
          ? "No action needed."
          : "Set FILE_DOWNLOAD_SIGNING_SECRET or SUPABASE_SERVICE_ROLE_KEY before relying on signed downloads in production.",
      envVars: ["FILE_DOWNLOAD_SIGNING_SECRET", "SUPABASE_SERVICE_ROLE_KEY"]
    })
  ];

  return {
    checks,
    issueCount: checks.filter((check) => check.status === "Needs attention").length,
    starterModeCount: checks.filter((check) => check.status === "Starter mode").length,
    healthyCount: checks.filter((check) => check.status === "Healthy").length
  };
}
