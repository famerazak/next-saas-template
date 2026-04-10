import { cookies } from "next/headers";
import { parseAnalyticsConsent, type AnalyticsConsentState, ANALYTICS_CONSENT_COOKIE } from "@/lib/analytics/consent";

export async function getAnalyticsConsentFromCookies(): Promise<AnalyticsConsentState> {
  const cookieStore = await cookies();
  return parseAnalyticsConsent(cookieStore.get(ANALYTICS_CONSENT_COOKIE)?.value);
}
