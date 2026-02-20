import { redirect } from "next/navigation";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function BillingPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
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
