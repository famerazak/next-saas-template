import { loadPlatformAuditEvents, type TenantAuditEvent } from "@/lib/audit/store";
import { loadPlatformSessionSummaries, type PlatformSessionSummary } from "@/lib/auth/session-registry";
import { loadPlatformWebhookJobsSnapshot, type PlatformWebhookJobsSnapshot } from "@/lib/billing/store";
import { loadPlatformDashboardSnapshot } from "@/lib/platform/dashboard";
import { loadPlatformTwoFactorStates, type TwoFactorState } from "@/lib/security/two-factor";

export type PlatformComplianceAuditEvent = TenantAuditEvent & {
  tenantName: string;
};

export type PlatformSecuritySignal = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  tenantNames: string[];
  isTwoFactorEnabled: boolean;
  backupCodesRemaining: number;
  sessionCount: number;
  lastSeenAt: string | null;
  status: "Good" | "Needs attention";
  summary: string;
};

export type PlatformComplianceSnapshot = {
  auditEvents: PlatformComplianceAuditEvent[];
  securitySignals: PlatformSecuritySignal[];
  webhookJobs: PlatformWebhookJobsSnapshot;
  auditEventCount: number;
  securitySignalCount: number;
  flaggedSecurityCount: number;
  pendingWebhookCount: number;
};

function fallbackFullName(email: string) {
  const localPart = email.split("@")[0] || email;
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function latestLastSeen(sessionSummary: PlatformSessionSummary | undefined) {
  return sessionSummary?.lastSeenAt ?? null;
}

function buildSecuritySummary(twoFactor: TwoFactorState | undefined, sessions: PlatformSessionSummary | undefined) {
  const parts: string[] = [];

  if (twoFactor?.isEnabled) {
    parts.push(
      twoFactor.backupCodesRemaining > 0
        ? `${twoFactor.backupCodesRemaining} backup codes ready`
        : "2FA enabled but backup codes missing"
    );
  } else {
    parts.push("2FA not enrolled");
  }

  parts.push(
    sessions && sessions.sessionCount > 1
      ? `${sessions.sessionCount} active sessions`
      : sessions?.sessionCount === 1
        ? "1 active session"
        : "No tracked sessions"
  );

  return parts.join(" · ");
}

function buildSignalStatus(twoFactor: TwoFactorState | undefined, sessions: PlatformSessionSummary | undefined) {
  if (!twoFactor?.isEnabled) {
    return "Needs attention" as const;
  }

  if (twoFactor.backupCodesRemaining === 0) {
    return "Needs attention" as const;
  }

  if ((sessions?.sessionCount ?? 0) > 1) {
    return "Needs attention" as const;
  }

  return "Good" as const;
}

export async function loadPlatformComplianceSnapshot(): Promise<PlatformComplianceSnapshot> {
  const [dashboard, auditEvents, twoFactorStates, sessionSummaries, webhookJobs] = await Promise.all([
    loadPlatformDashboardSnapshot(),
    loadPlatformAuditEvents({ limit: 80 }),
    loadPlatformTwoFactorStates(),
    loadPlatformSessionSummaries(),
    loadPlatformWebhookJobsSnapshot()
  ]);

  const tenantNames = new Map(dashboard.tenants.map((tenant) => [tenant.tenantId, tenant.tenantName]));
  const userInfo = new Map(
    dashboard.tenants
      .flatMap((tenant) => tenant.members)
      .map((member) => [member.id, { fullName: member.fullName, email: member.email }])
  );
  const twoFactorByUserId = new Map(twoFactorStates.map((state) => [state.userId, state]));
  const sessionsByUserId = new Map(sessionSummaries.map((summary) => [summary.userId, summary]));
  const userIds = new Set<string>([
    ...[...userInfo.keys()],
    ...twoFactorStates.map((state) => state.userId),
    ...sessionSummaries.map((summary) => summary.userId)
  ]);

  const auditFeed: PlatformComplianceAuditEvent[] = auditEvents.map((event) => ({
    ...event,
    tenantName: tenantNames.get(event.tenantId) ?? event.tenantId
  }));

  const securitySignals: PlatformSecuritySignal[] = [...userIds]
    .map((userId) => {
      const user = userInfo.get(userId);
      const twoFactor = twoFactorByUserId.get(userId);
      const sessions = sessionsByUserId.get(userId);
      const email = user?.email ?? twoFactor?.email ?? sessions?.email ?? userId;
      const fullName = user?.fullName?.trim() || fallbackFullName(email);
      const status = buildSignalStatus(twoFactor, sessions);

      return {
        id: `signal_${userId}`,
        userId,
        email,
        fullName,
        tenantNames: sessions?.tenantNames ?? [],
        isTwoFactorEnabled: twoFactor?.isEnabled ?? false,
        backupCodesRemaining: twoFactor?.backupCodesRemaining ?? 0,
        sessionCount: sessions?.sessionCount ?? 0,
        lastSeenAt: latestLastSeen(sessions),
        status,
        summary: buildSecuritySummary(twoFactor, sessions)
      } satisfies PlatformSecuritySignal;
    })
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "Needs attention" ? -1 : 1;
      }
      return left.email.localeCompare(right.email);
    });

  return {
    auditEvents: auditFeed,
    securitySignals,
    webhookJobs,
    auditEventCount: auditFeed.length,
    securitySignalCount: securitySignals.length,
    flaggedSecurityCount: securitySignals.filter((signal) => signal.status === "Needs attention").length,
    pendingWebhookCount: webhookJobs.pendingDeadLetters.length
  };
}
