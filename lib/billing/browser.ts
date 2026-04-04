import type { BillingPaymentMethod } from "@/lib/billing/store";

function storageKey(tenantId: string) {
  return `billing_payment_method:${tenantId}`;
}

export function readStoredPaymentMethod(tenantId: string): BillingPaymentMethod | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(tenantId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as BillingPaymentMethod;
  } catch {
    return null;
  }
}

export function writeStoredPaymentMethod(tenantId: string, paymentMethod: BillingPaymentMethod) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(tenantId), JSON.stringify(paymentMethod));
}
