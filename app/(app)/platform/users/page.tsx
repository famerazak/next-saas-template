import { PlatformUsersDirectory } from "@/components/platform-users-directory";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadPlatformUsersSnapshot } from "@/lib/platform/users";

export default async function PlatformUsersPage() {
  const session = await getAppSessionFromCookies();
  const snapshot = await loadPlatformUsersSnapshot();

  return (
    <main className="page-shell">
      <PlatformUsersDirectory adminEmail={session?.email ?? "platform admin"} snapshot={snapshot} />
    </main>
  );
}
