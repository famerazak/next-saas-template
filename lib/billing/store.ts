import type { AppSession } from "@/lib/auth/session";

export type BillingPlanId = "starter" | "growth";
export type CardBrand = "Visa" | "Mastercard" | "American Express" | "Unknown";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  monthlyBase: number;
  monthlyPerSeat: number;
  description: string;
};

export type BillingCheckout = {
  checkoutId: string;
  checkoutUrl: string;
  selectedPlanId: BillingPlanId;
  selectedPlanName: string;
  seatCount: number;
  estimatedMonthlyTotal: number;
  startedAt: string;
  status: "ready";
};

export type BillingPaymentMethod = {
  paymentMethodId: string;
  brand: CardBrand;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  billingEmail: string;
  updatedAt: string;
};

export type BillingPaymentMethodSetup = {
  setupId: string;
  setupUrl: string;
  returnUrl: string;
  startedAt: string;
  status: "ready";
};

export type BillingSnapshot = {
  tenantId: string;
  tenantName: string;
  billingOwnerEmail: string;
  currentPlanName: string;
  seatCount: number;
  estimatedMonthlyTotal: number;
  availablePlans: BillingPlan[];
  checkout: BillingCheckout | null;
  paymentMethod: BillingPaymentMethod | null;
  paymentMethodSetup: BillingPaymentMethodSetup | null;
};

type LocalBillingState = {
  checkout: BillingCheckout | null;
  paymentMethod: BillingPaymentMethod | null;
  paymentMethodSetup: BillingPaymentMethodSetup | null;
};

type LocalBillingStore = Map<string, LocalBillingState>;

declare global {
  // eslint-disable-next-line no-var
  var __localBillingStore: LocalBillingStore | undefined;
}

const BILLING_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyBase: 79,
    monthlyPerSeat: 12,
    description: "Core workspace features for smaller B2B teams."
  },
  {
    id: "growth",
    name: "Growth",
    monthlyBase: 199,
    monthlyPerSeat: 18,
    description: "Expanded controls and support for larger operating teams."
  }
];

function getLocalBillingStore(): LocalBillingStore {
  if (!globalThis.__localBillingStore) {
    globalThis.__localBillingStore = new Map<string, LocalBillingState>();
  }

  return globalThis.__localBillingStore;
}

function getBillingState(tenantId: string): LocalBillingState {
  const store = getLocalBillingStore();
  const existing = store.get(tenantId);
  if (existing) {
    return existing;
  }

  const fresh: LocalBillingState = {
    checkout: null,
    paymentMethod: null,
    paymentMethodSetup: null
  };
  store.set(tenantId, fresh);
  return fresh;
}

function saveBillingState(tenantId: string, state: LocalBillingState): LocalBillingState {
  getLocalBillingStore().set(tenantId, state);
  return state;
}

function resolvePlan(planId: BillingPlanId): BillingPlan {
  return BILLING_PLANS.find((plan) => plan.id === planId) ?? BILLING_PLANS[0];
}

function normalizeCardBrand(cardNumber: string): CardBrand {
  if (cardNumber.startsWith("4")) {
    return "Visa";
  }
  if (/^5[1-5]/.test(cardNumber) || /^2(2[2-9]|[3-6]|7[01])/.test(cardNumber)) {
    return "Mastercard";
  }
  if (/^3[47]/.test(cardNumber)) {
    return "American Express";
  }
  return "Unknown";
}

export function calculateEstimatedMonthlyTotal(planId: BillingPlanId, seatCount: number): number {
  const plan = resolvePlan(planId);
  return plan.monthlyBase + plan.monthlyPerSeat * seatCount;
}

export function getBillingPlanCatalog(): BillingPlan[] {
  return BILLING_PLANS;
}

export async function loadBillingSnapshotForSession(
  session: AppSession,
  options?: { recommendedSeatCount?: number }
): Promise<BillingSnapshot> {
  const recommendedSeatCount = Math.max(options?.recommendedSeatCount ?? 1, 1);
  const state = session.tenantId ? getBillingState(session.tenantId) : null;
  const checkout = state?.checkout ?? null;
  const fallbackPlanId = checkout?.selectedPlanId ?? "starter";

  return {
    tenantId: session.tenantId ?? "",
    tenantName: session.tenantName ?? "Workspace",
    billingOwnerEmail: session.email,
    currentPlanName: checkout?.selectedPlanName ?? "Starter Trial",
    seatCount: checkout?.seatCount ?? recommendedSeatCount,
    estimatedMonthlyTotal:
      checkout?.estimatedMonthlyTotal ?? calculateEstimatedMonthlyTotal(fallbackPlanId, recommendedSeatCount),
    availablePlans: getBillingPlanCatalog(),
    checkout,
    paymentMethod: state?.paymentMethod ?? null,
    paymentMethodSetup: state?.paymentMethodSetup ?? null
  };
}

export async function startBillingCheckoutForSession(
  session: AppSession,
  input: { selectedPlanId: BillingPlanId; seatCount: number }
): Promise<{ checkout: BillingCheckout; persistedToDatabase: boolean }> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const state = getBillingState(session.tenantId);
  const plan = resolvePlan(input.selectedPlanId);
  const checkoutId = `chk_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const checkout: BillingCheckout = {
    checkoutId,
    checkoutUrl: `/billing?checkout=ready&checkout_id=${checkoutId}`,
    selectedPlanId: plan.id,
    selectedPlanName: plan.name,
    seatCount: input.seatCount,
    estimatedMonthlyTotal: calculateEstimatedMonthlyTotal(plan.id, input.seatCount),
    startedAt: new Date().toISOString(),
    status: "ready"
  };

  saveBillingState(session.tenantId, {
    ...state,
    checkout
  });

  return {
    checkout,
    persistedToDatabase: false
  };
}

export async function startPaymentMethodSetupForSession(
  session: AppSession
): Promise<{ setup: BillingPaymentMethodSetup; persistedToDatabase: boolean }> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const setupId = `seti_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const setup: BillingPaymentMethodSetup = {
    setupId,
    setupUrl: `/billing/payment-method?setup=${setupId}`,
    returnUrl: "/billing?payment_method=updated",
    startedAt: new Date().toISOString(),
    status: "ready"
  };

  return {
    setup,
    persistedToDatabase: false
  };
}

export async function savePaymentMethodForSession(
  session: AppSession,
  input: {
    setupId: string;
    cardholderName: string;
    billingEmail: string;
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
  }
): Promise<{ paymentMethod: BillingPaymentMethod; persistedToDatabase: boolean }> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }
  if (!input.setupId.trim().startsWith("seti_")) {
    throw new Error("Payment method setup session not found.");
  }

  const paymentMethod: BillingPaymentMethod = {
    paymentMethodId: `pm_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    brand: normalizeCardBrand(input.cardNumber),
    last4: input.cardNumber.slice(-4),
    expiryMonth: input.expiryMonth,
    expiryYear: input.expiryYear,
    cardholderName: input.cardholderName,
    billingEmail: input.billingEmail,
    updatedAt: new Date().toISOString()
  };

  return {
    paymentMethod,
    persistedToDatabase: false
  };
}
