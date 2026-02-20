import { redirect } from "next/navigation";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function TeamPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
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
