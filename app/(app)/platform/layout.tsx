import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";

type PlatformLayoutProps = {
  children: ReactNode;
};

export default async function PlatformAreaLayout({ children }: PlatformLayoutProps) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  if (!canAccessPlatformAdminArea(session)) {
    return (
      <NoAccessCard
        areaName="platform operations"
        supportText="Ask an existing platform admin if you need operational access."
      />
    );
  }

  return children;
}
