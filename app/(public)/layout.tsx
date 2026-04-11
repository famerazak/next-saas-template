import type { ReactNode } from "react";
import { PublicLegalFooter } from "@/components/public-legal-footer";
import { PublicSiteHeader } from "@/components/site-nav";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <PublicSiteHeader />
      {children}
      <PublicLegalFooter />
    </>
  );
}
