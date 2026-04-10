export const ANALYTICS_CONSENT_COOKIE = "analytics_consent";
export const ANALYTICS_CONSENT_EVENT = "analytics-consent-changed";

export type AnalyticsConsentState = "unknown" | "accepted" | "rejected";

export function parseAnalyticsConsent(value: string | null | undefined): AnalyticsConsentState {
  if (value === "accepted" || value === "rejected") {
    return value;
  }

  return "unknown";
}

export function buildAnalyticsConsentCookieValue(state: Exclude<AnalyticsConsentState, "unknown">): string {
  return `${ANALYTICS_CONSENT_COOKIE}=${state}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax`;
}
