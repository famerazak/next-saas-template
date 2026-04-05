import { PlatformDashboard } from "@/components/platform-dashboard";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformDashboardSnapshot } from "@/lib/platform/dashboard";

export default async function PlatformHomePage() {
  const session = await getAppSessionFromCookies();
  const snapshot = await loadPlatformDashboardSnapshot();

  return (
    <main className="page-shell">
      <PlatformDashboard adminEmail={session?.email ?? "platform admin"} snapshot={snapshot} />
    </main>
  );
}
