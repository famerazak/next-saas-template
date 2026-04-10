"use client";

import { useState } from "react";
import {
  buildAnalyticsConsentCookieValue,
  type AnalyticsConsentState
} from "@/lib/analytics/consent";

type CookieConsentBannerProps = {
  initialConsent: AnalyticsConsentState;
};

export function CookieConsentBanner({ initialConsent }: CookieConsentBannerProps) {
  const [consent, setConsent] = useState<AnalyticsConsentState>(initialConsent);

  if (consent !== "unknown") {
    return null;
  }

  function applyConsent(nextConsent: Exclude<AnalyticsConsentState, "unknown">) {
    document.cookie = buildAnalyticsConsentCookieValue(nextConsent);
    setConsent(nextConsent);
  }

  return (
    <aside className="cookie-consent-banner" data-testid="cookie-consent-banner" aria-label="Cookie consent">
      <div className="cookie-consent-copy">
        <span className="cookie-consent-eyebrow">Analytics consent</span>
        <strong>Choose whether optional analytics cookies can run.</strong>
        <p>
          We only use analytics to understand product usage patterns. Rejecting keeps the app fully usable and stores
          your preference for future visits.
        </p>
      </div>
      <div className="cookie-consent-actions">
        <button
          type="button"
          className="header-link-button"
          data-testid="cookie-consent-reject"
          onClick={() => applyConsent("rejected")}
        >
          Reject analytics
        </button>
        <button
          type="button"
          className="header-link-button header-link-button-primary"
          data-testid="cookie-consent-accept"
          onClick={() => applyConsent("accepted")}
        >
          Accept analytics
        </button>
      </div>
    </aside>
  );
}
