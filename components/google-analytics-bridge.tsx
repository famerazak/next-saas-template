"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  type AnalyticsConsentState
} from "@/lib/analytics/consent";

type GoogleAnalyticsBridgeProps = {
  initialConsent: AnalyticsConsentState;
  measurementId: string | null;
};

type ConsentEventDetail = {
  consent: Exclude<AnalyticsConsentState, "unknown">;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __analyticsState?: {
      active: boolean;
      consent: AnalyticsConsentState;
      measurementId: string | null;
      pageViews: number;
      lastPagePath: string | null;
    };
    __gaInitializedIds?: string[];
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

function ensureGtag(measurementId: string) {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  const initializedIds = new Set(window.__gaInitializedIds ?? []);
  if (!initializedIds.has(measurementId)) {
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      send_page_view: false
    });
    initializedIds.add(measurementId);
    window.__gaInitializedIds = Array.from(initializedIds);
  }
}

export function GoogleAnalyticsBridge({ initialConsent, measurementId }: GoogleAnalyticsBridgeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<AnalyticsConsentState>(initialConsent);
  const trackedPathRef = useRef<string | null>(null);

  const pagePath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const isActive = consent === "accepted" && Boolean(measurementId);

  useEffect(() => {
    const handleConsentChanged = (event: Event) => {
      const detail = (event as CustomEvent<ConsentEventDetail>).detail;
      if (detail?.consent === "accepted" || detail?.consent === "rejected") {
        setConsent(detail.consent);
      }
    };

    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChanged as EventListener);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    const previousPageViews = window.__analyticsState?.pageViews ?? 0;
    const previousLastPath = window.__analyticsState?.lastPagePath ?? null;

    if (!measurementId) {
      window.__analyticsState = {
        active: false,
        consent,
        measurementId: null,
        pageViews: previousPageViews,
        lastPagePath: previousLastPath
      };
      return;
    }

    window[`ga-disable-${measurementId}`] = !isActive;

    if (!isActive) {
      window.__analyticsState = {
        active: false,
        consent,
        measurementId,
        pageViews: previousPageViews,
        lastPagePath: previousLastPath
      };
      return;
    }

    ensureGtag(measurementId);
    window.__analyticsState = {
      active: true,
      consent,
      measurementId,
      pageViews: previousPageViews,
      lastPagePath: previousLastPath
    };
  }, [consent, isActive, measurementId]);

  useEffect(() => {
    if (!isActive || !measurementId || trackedPathRef.current === pagePath) {
      return;
    }

    ensureGtag(measurementId);
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title
    });

    const previousPageViews = window.__analyticsState?.pageViews ?? 0;
    trackedPathRef.current = pagePath;
    window.__analyticsState = {
      active: true,
      consent,
      measurementId,
      pageViews: previousPageViews + 1,
      lastPagePath: pagePath
    };
  }, [consent, isActive, measurementId, pagePath, pathname]);

  return (
    <>
      {isActive && measurementId ? (
        <Script
          id="ga-loader"
          data-testid="ga-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
          strategy="afterInteractive"
        />
      ) : null}
      <div
        hidden
        data-testid="ga-runtime-state"
        data-active={isActive ? "true" : "false"}
        data-consent={consent}
        data-measurement-id={measurementId ?? "none"}
      />
    </>
  );
}
