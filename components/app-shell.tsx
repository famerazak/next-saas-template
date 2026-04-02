"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AppNavLink } from "@/components/site-nav";

type AppShellProps = {
  children: ReactNode;
  email: string;
  avatarLabel: string;
  avatarInitials: string;
  navLinks: AppNavLink[];
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  email,
  avatarLabel,
  avatarInitials,
  navLinks
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="app-frame">
      <header className="app-topbar">
        <div className="app-topbar-left">
          <button
            type="button"
            className="app-menu-toggle"
            onClick={() => setDrawerOpen((current) => !current)}
            aria-expanded={drawerOpen}
            aria-controls="app-sidebar"
            data-testid="app-shell-menu-toggle"
          >
            <span />
            <span />
            <span />
            <span className="sr-only">Toggle navigation</span>
          </button>
          <Link href="/dashboard" className="site-brand app-brand">
            Next SaaS Template
          </Link>
        </div>
        <div className="app-topbar-actions">
          <span className="sr-only" data-testid="nav-auth-state">
            Signed in as {email}
          </span>
          <Link
            href="/settings/profile"
            className="profile-avatar"
            data-testid="header-profile-avatar"
            aria-label={`Open profile settings for ${avatarLabel}`}
            title={avatarLabel}
          >
            <span>{avatarInitials}</span>
          </Link>
          <form method="post" action="/api/auth/logout">
            <button type="submit" className="header-link-button">
              Log out
            </button>
          </form>
        </div>
      </header>

      <div className="app-layout">
        <div
          className={`app-sidebar-backdrop${drawerOpen ? " is-open" : ""}`}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
        <aside
          id="app-sidebar"
          className={`app-sidebar${drawerOpen ? " is-open" : ""}`}
          data-testid="app-sidebar"
          data-state={drawerOpen ? "open" : "closed"}
          aria-label="App navigation"
        >
          <div className="app-sidebar-inner">
            <div className="app-sidebar-heading">
              <span className="app-sidebar-eyebrow">Product App</span>
              <strong>Workspace navigation</strong>
            </div>
            <nav className="app-sidebar-nav">
              {navLinks.map((link) => {
                const active = isActivePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`app-sidebar-link${active ? " is-active" : ""}`}
                    data-testid={link.testId}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
