import type { AppSession } from "@/lib/auth/session";

export type BillingPlanId = "starter" | "growth";

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

export type BillingSnapshot = {
  tenantId: string;
  tenantName: string;
  billingOwnerEmail: string;
  currentPlanName: string;
  seatCount: number;
  estimatedMonthlyTotal: number;
  availablePlans: BillingPlan[];
  checkout: BillingCheckout | null;
};

type LocalBillingStore = Map<string, BillingCheckout>;

declare global {
  // eslint-disable-next-line no-var
  var __localBillingCheckoutStore: LocalBillingStore | undefined;
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
  if (!globalThis.__localBillingCheckoutStore) {
    globalThis.__localBillingCheckoutStore = new Map<string, BillingCheckout>();
  }

  return globalThis.__localBillingCheckoutStore;
}

function resolvePlan(planId: BillingPlanId): BillingPlan {
  return BILLING_PLANS.find((plan) => plan.id === planId) ?? BILLING_PLANS[0];
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
  const checkout = session.tenantId ? getLocalBillingStore().get(session.tenantId) ?? null : null;
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
    checkout
  };
}

export async function startBillingCheckoutForSession(
  session: AppSession,
  input: { selectedPlanId: BillingPlanId; seatCount: number }
): Promise<{ checkout: BillingCheckout; persistedToDatabase: boolean }> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

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

  getLocalBillingStore().set(session.tenantId, checkout);

  return {
    checkout,
    persistedToDatabase: false
  };
}
