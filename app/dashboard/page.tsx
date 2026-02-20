type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function fromQuery(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const tenantName = fromQuery(resolvedSearchParams.tenantName);
  const role = fromQuery(resolvedSearchParams.role);

  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Dashboard</h1>
        <p className="auth-subtitle">Account created. You are now in the app shell.</p>
        {tenantName ? <p data-testid="tenant-name">Tenant: {tenantName}</p> : null}
        {role ? <p data-testid="tenant-role">Role: {role}</p> : null}
      </section>
    </main>
  );
}
