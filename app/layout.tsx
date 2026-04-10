import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { getAnalyticsConsentFromCookies } from "@/lib/analytics/consent.server";

export const metadata: Metadata = {
  title: "Next SaaS Template",
  description: "B2B SaaS starter template"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const analyticsConsent = await getAnalyticsConsentFromCookies();

  return (
    <html lang="en">
      <body>
        {children}
        <CookieConsentBanner initialConsent={analyticsConsent} />
      </body>
    </html>
  );
}
