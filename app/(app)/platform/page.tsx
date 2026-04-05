import { PlatformHomePanel } from "@/components/platform-home-panel";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function PlatformHomePage() {
  const session = await getAppSessionFromCookies();

  return (
    <main className="page-shell">
      <PlatformHomePanel adminEmail={session?.email ?? "platform admin"} />
    </main>
  );
}
