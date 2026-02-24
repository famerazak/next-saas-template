import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function TeamPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (!canAccessTenantAdminArea(session)) {
    return <NoAccessCard areaName="team management" />;
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Team</h1>
        <p className="auth-subtitle">Team management area for tenant administrators.</p>
      </section>
    </main>
  );
}
