import { PlatformBillingSupportConsole } from "@/components/platform-billing-support-console";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformBillingSupportSnapshot } from "@/lib/platform/billing-support";

export default async function PlatformBillingSupportPage() {
  const session = await getAppSessionFromCookies();
  const snapshot = await loadPlatformBillingSupportSnapshot();

  return (
    <main className="page-shell">
      <PlatformBillingSupportConsole adminEmail={session?.email ?? "platform admin"} snapshot={snapshot} />
    </main>
  );
}
