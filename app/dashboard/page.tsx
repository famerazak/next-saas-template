import { redirect } from "next/navigation";
import { getAppSessionFromCookies } from "@/lib/auth/session";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function fromQuery(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const tenantName = fromQuery(resolvedSearchParams.tenantName);
  const role = fromQuery(resolvedSearchParams.role);
  const email = fromQuery(resolvedSearchParams.email);

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Dashboard</h1>
        <p className="auth-subtitle">Account created. You are now in the app shell.</p>
        {email ? <p data-testid="dashboard-email">Email: {email}</p> : null}
        {tenantName ? <p data-testid="tenant-name">Tenant: {tenantName}</p> : null}
        {role ? <p data-testid="tenant-role">Role: {role}</p> : null}
      </section>
    </main>
  );
}
