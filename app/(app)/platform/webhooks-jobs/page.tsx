import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { PlatformWebhookJobsConsole } from "@/components/platform-webhook-jobs-console";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformWebhookJobsSnapshot } from "@/lib/billing/store";

export default async function PlatformWebhooksJobsPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  if (!canAccessPlatformAdminArea(session)) {
    return (
      <NoAccessCard
        areaName="platform webhook jobs"
        supportText="Ask an existing platform admin if you need operational access."
      />
    );
  }

  const snapshot = await loadPlatformWebhookJobsSnapshot();

  return (
    <main className="page-shell">
      <PlatformWebhookJobsConsole initialSnapshot={snapshot} />
    </main>
  );
}
