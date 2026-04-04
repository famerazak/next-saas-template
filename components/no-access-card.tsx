import Link from "next/link";

type NoAccessCardProps = {
  areaName: string;
  supportText?: string;
};

export function NoAccessCard({ areaName, supportText }: NoAccessCardProps) {
  return (
    <main className="page-shell">
      <section className="auth-card" data-testid="no-access-card">
        <h1>No access</h1>
        <p className="auth-subtitle">
          Your role does not allow access to the {areaName} area.
        </p>
        <p className="auth-subtitle">{supportText ?? "Ask a tenant admin if you need this permission."}</p>
        <nav className="auth-links" aria-label="No access shortcuts">
          <Link href="/dashboard">Back to dashboard</Link>
          <Link href="/settings/profile">Profile settings</Link>
        </nav>
      </section>
    </main>
  );
}
