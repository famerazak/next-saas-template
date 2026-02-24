import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function BillingPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (!canAccessTenantAdminArea(session)) {
    return <NoAccessCard areaName="billing" />;
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Billing</h1>
        <p className="auth-subtitle">Billing and subscription area for tenant administrators.</p>
      </section>
    </main>
  );
}
