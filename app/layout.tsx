import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { GoogleAnalyticsBridge } from "@/components/google-analytics-bridge";
import { getAnalyticsConsentFromCookies } from "@/lib/analytics/consent.server";
import { getGoogleAnalyticsMeasurementId } from "@/lib/analytics/google-analytics";

export const metadata: Metadata = {
  title: "Next SaaS Template",
  description: "B2B SaaS starter template"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const analyticsConsent = await getAnalyticsConsentFromCookies();
  const gaMeasurementId = getGoogleAnalyticsMeasurementId();

  return (
    <html lang="en">
      <body>
        {children}
        <GoogleAnalyticsBridge initialConsent={analyticsConsent} measurementId={gaMeasurementId} />
        <CookieConsentBanner initialConsent={analyticsConsent} />
      </body>
    </html>
  );
}
