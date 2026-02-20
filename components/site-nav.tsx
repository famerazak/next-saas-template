import Link from "next/link";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export async function SiteNav() {
  const session = await getAppSessionFromCookies();
  const role = session?.role ?? "Member";
  const canManageTenant = role === "Owner" || role === "Admin";

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Site navigation">
        <Link href="/" className="site-brand">
          Next SaaS Template
        </Link>
        <div className="site-nav-links">
          {session ? (
            <>
              <span className="session-pill" data-testid="nav-auth-state">
                Signed in as {session.email}
              </span>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/settings/profile">Profile</Link>
              {canManageTenant ? (
                <>
                  <Link href="/team" data-testid="nav-link-team">
                    Team
                  </Link>
                  <Link href="/billing" data-testid="nav-link-billing">
                    Billing
                  </Link>
                  <Link href="/audit-logs" data-testid="nav-link-audit-logs">
                    Audit Logs
                  </Link>
                </>
              ) : null}
              <form method="post" action="/api/auth/logout">
                <button type="submit" className="link-button">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <span className="session-pill" data-testid="nav-auth-state">
                Signed out
              </span>
              <Link href="/login">Log in</Link>
              <Link href="/signup">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
