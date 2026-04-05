import { redirect } from "next/navigation";
import { PlatformWebhookJobsConsole } from "@/components/platform-webhook-jobs-console";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformWebhookJobsSnapshot } from "@/lib/billing/store";

export default async function PlatformWebhooksJobsPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const snapshot = await loadPlatformWebhookJobsSnapshot();

  return (
    <main className="page-shell">
      <PlatformWebhookJobsConsole initialSnapshot={snapshot} />
    </main>
  );
}
