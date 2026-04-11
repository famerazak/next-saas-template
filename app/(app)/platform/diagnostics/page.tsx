import { PlatformDiagnosticsConsole } from "@/components/platform-diagnostics-console";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformDiagnosticsSnapshot } from "@/lib/platform/diagnostics";

export default async function PlatformDiagnosticsPage() {
  const session = await getAppSessionFromCookies();
  const snapshot = await loadPlatformDiagnosticsSnapshot();

  return (
    <main className="page-shell">
      <PlatformDiagnosticsConsole adminEmail={session?.email ?? "platform admin"} snapshot={snapshot} />
    </main>
  );
}
