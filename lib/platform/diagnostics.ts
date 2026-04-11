import securityHeaderProfilesJson from "@/security-headers.config.json";
import {
  loadPlatformConfigDiagnosticsSnapshot,
  type PlatformConfigDiagnostic
} from "@/lib/platform/config-diagnostics";
import { loadPlatformAppErrors, type PlatformAppErrorRecord } from "@/lib/platform/errors";

type SecurityHeaderDefinition = {
  key: string;
  value: string;
};

type SecurityHeaderProfileConfig = {
  id: string;
  label: string;
  summary: string;
  matcher: string;
  samplePath: string;
  headers: SecurityHeaderDefinition[];
};

export type PlatformHeaderDiagnostic = {
  id: string;
  label: string;
  summary: string;
  matcher: string;
  samplePath: string;
  headers: SecurityHeaderDefinition[];
  headerCount: number;
  cspStatus: "Configured" | "Missing";
  status: "Healthy" | "Needs attention";
};

export type PlatformDiagnosticsSnapshot = {
  errors: PlatformAppErrorRecord[];
  headerDiagnostics: PlatformHeaderDiagnostic[];
  configDiagnostics: PlatformConfigDiagnostic[];
  errorCount: number;
  repeatedErrorCount: number;
  cspProtectedSurfaceCount: number;
  unhealthySurfaceCount: number;
  configIssueCount: number;
  configStarterModeCount: number;
};

const securityHeaderProfiles = securityHeaderProfilesJson as SecurityHeaderProfileConfig[];

function hasCsp(headers: SecurityHeaderDefinition[]) {
  return headers.some((header) => header.key === "Content-Security-Policy" && header.value.trim().length > 0);
}

export async function loadPlatformDiagnosticsSnapshot(): Promise<PlatformDiagnosticsSnapshot> {
  const errors = await loadPlatformAppErrors({ limit: 20 });
  const configDiagnostics = loadPlatformConfigDiagnosticsSnapshot();
  const headerDiagnostics = securityHeaderProfiles.map((profile) => {
    const cspStatus = hasCsp(profile.headers) ? "Configured" : "Missing";

    return {
      ...profile,
      headerCount: profile.headers.length,
      cspStatus,
      status: cspStatus === "Configured" ? "Healthy" : "Needs attention"
    } satisfies PlatformHeaderDiagnostic;
  });

  return {
    errors,
    headerDiagnostics,
    configDiagnostics: configDiagnostics.checks,
    errorCount: errors.length,
    repeatedErrorCount: errors.filter((error) => error.occurrenceCount > 1).length,
    cspProtectedSurfaceCount: headerDiagnostics.filter((profile) => profile.cspStatus === "Configured").length,
    unhealthySurfaceCount: headerDiagnostics.filter((profile) => profile.status === "Needs attention").length,
    configIssueCount: configDiagnostics.issueCount,
    configStarterModeCount: configDiagnostics.starterModeCount
  };
}
