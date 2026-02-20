import Link from "next/link";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export async function SiteNav() {
  const session = await getAppSessionFromCookies();

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
