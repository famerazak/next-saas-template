import { PlatformSettingsConsole } from "@/components/platform-settings-console";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformSettingsSnapshot } from "@/lib/platform/settings";

export default async function PlatformSettingsPage() {
  const session = await getAppSessionFromCookies();
  const snapshot = await loadPlatformSettingsSnapshot();

  return (
    <main className="page-shell">
      <PlatformSettingsConsole adminEmail={session?.email ?? "platform admin"} snapshot={snapshot} />
    </main>
  );
}
