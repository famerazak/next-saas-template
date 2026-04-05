import { PlatformComplianceExplorer } from "@/components/platform-compliance-explorer";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformComplianceSnapshot } from "@/lib/platform/compliance";

export default async function PlatformCompliancePage() {
  const session = await getAppSessionFromCookies();
  const snapshot = await loadPlatformComplianceSnapshot();

  return (
    <main className="page-shell">
      <PlatformComplianceExplorer adminEmail={session?.email ?? "platform admin"} snapshot={snapshot} />
    </main>
  );
}
