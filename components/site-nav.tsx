import Link from "next/link";
import { canAccessTenantAdminArea } from "@/lib/auth/authorization";
import type { AppSession } from "@/lib/auth/session";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export type AppNavLink = {
  href: string;
  label: string;
  testId: string;
};

type AppShellProps = {
  email: string;
  avatarLabel: string;
  avatarInitials: string;
  navLinks: AppNavLink[];
};

function buildAvatarInitials(session: AppSession): string {
  const source = session.fullName?.trim() || session.email;
  const words = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "NA";
}

function buildAvatarLabel(session: AppSession): string {
  return session.fullName?.trim() || session.email;
}

export function buildSidebarLinks(session: AppSession): AppNavLink[] {
  const links: AppNavLink[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      testId: "sidebar-link-dashboard"
    },
    {
      href: "/security",
      label: "Security",
      testId: "sidebar-link-security"
    }
  ];

  if (canAccessTenantAdminArea(session)) {
    links.push(
      {
        href: "/settings/tenant",
        label: "Tenant settings",
        testId: "sidebar-link-tenant-settings"
      },
      {
        href: "/team",
        label: "Team",
        testId: "sidebar-link-team"
      },
      {
        href: "/roles-permissions",
        label: "Roles & permissions",
        testId: "sidebar-link-roles-permissions"
      },
      {
        href: "/billing",
        label: "Billing",
        testId: "sidebar-link-billing"
      },
      {
        href: "/audit-logs",
        label: "Audit Logs",
        testId: "sidebar-link-audit-logs"
      }
    );
  }

  return links;
}

export function buildAppShellProps(session: AppSession): AppShellProps {
  return {
    email: session.email,
    avatarLabel: buildAvatarLabel(session),
    avatarInitials: buildAvatarInitials(session),
    navLinks: buildSidebarLinks(session)
  };
}

export async function PublicSiteHeader() {
  const session = await getAppSessionFromCookies();
  const avatarInitials = session ? buildAvatarInitials(session) : null;
  const avatarLabel = session ? buildAvatarLabel(session) : null;

  return (
    <header className="public-header">
      <nav className="public-nav" aria-label="Public site navigation">
        <Link href={session ? "/dashboard" : "/"} className="site-brand">
          Next SaaS Template
        </Link>
        <div className="public-actions">
          <span className="sr-only" data-testid="nav-auth-state">
            {session ? `Signed in as ${session.email}` : "Signed out"}
          </span>
          {session ? (
            <>
              <Link
                href="/settings/profile"
                className="profile-avatar"
                data-testid="header-profile-avatar"
                aria-label={`Open profile settings for ${avatarLabel}`}
                title={avatarLabel ?? undefined}
              >
                <span>{avatarInitials}</span>
              </Link>
              <form method="post" action="/api/auth/logout">
                <button type="submit" className="header-link-button">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="header-link-button">
                Log in
              </Link>
              <Link href="/signup" className="header-link-button header-link-button-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
