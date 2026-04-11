export function getGoogleAnalyticsMeasurementId(): string | null {
  const configured = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.E2E_AUTH_BYPASS === "1") {
    return "G-E2E000001";
  }

  return null;
}
