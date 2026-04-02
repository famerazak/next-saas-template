import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { buildAppShellProps } from "@/components/site-nav";
import { getAppSessionFromCookies } from "@/lib/auth/session";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AuthenticatedAppLayout({ children }: AppLayoutProps) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  return <AppShell {...buildAppShellProps(session)}>{children}</AppShell>;
}
