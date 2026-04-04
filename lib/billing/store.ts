import crypto from "node:crypto";
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

export type BillingWebhookEventType = "checkout.session.completed" | "invoice.paid";
export type BillingWebhookDeliveryStatus = "Processed" | "Duplicate";
export type BillingInvoiceSyncStatus = "Pending" | "Paid";

export type BillingWebhookActivity = {
  eventId: string;
  eventType: BillingWebhookEventType;
  deliveryStatus: BillingWebhookDeliveryStatus;
  receivedAt: string;
  summary: string;
};

export type StripeWebhookEvent = {
  id: string;
  type: BillingWebhookEventType;
  createdAt: string;
  data: {
    object: {
      tenantId: string;
      checkoutId?: string;
      planId?: BillingPlanId;
      seatCount?: number;
      invoiceId?: string;
      amount?: number;
    };
  };
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
  latestInvoiceStatus: BillingInvoiceSyncStatus;
  processedWebhookCount: number;
  duplicateWebhookCount: number;
  webhookActivity: BillingWebhookActivity[];
};

type LocalBillingState = {
  checkout: BillingCheckout | null;
  paymentMethod: BillingPaymentMethod | null;
  paymentMethodSetup: BillingPaymentMethodSetup | null;
  latestInvoiceStatus: BillingInvoiceSyncStatus;
  processedWebhookCount: number;
  duplicateWebhookCount: number;
  processedWebhookIds: string[];
  webhookActivity: BillingWebhookActivity[];
  latestReplayableEvent: StripeWebhookEvent | null;
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

const DEFAULT_STRIPE_WEBHOOK_SECRET = "whsec_local_dev";

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
    paymentMethodSetup: null,
    latestInvoiceStatus: "Pending",
    processedWebhookCount: 0,
    duplicateWebhookCount: 0,
    processedWebhookIds: [],
    webhookActivity: [],
    latestReplayableEvent: null
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

function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || DEFAULT_STRIPE_WEBHOOK_SECRET;
}

function createStripeSignature(payload: string, timestamp: string) {
  return crypto.createHmac("sha256", getStripeWebhookSecret()).update(`${timestamp}.${payload}`).digest("hex");
}

function constantTimeMatch(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(first, second);
}

function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  if (!signatureHeader) {
    return false;
  }

  const segments = signatureHeader.split(",").map((segment) => segment.trim());
  const timestamp = segments.find((segment) => segment.startsWith("t="))?.slice(2);
  const signature = segments.find((segment) => segment.startsWith("v1="))?.slice(3);
  if (!timestamp || !signature) {
    return false;
  }

  const expected = createStripeSignature(payload, timestamp);
  return constantTimeMatch(expected, signature);
}

function parseWebhookEvent(payload: string): StripeWebhookEvent {
  const parsed = JSON.parse(payload) as Partial<StripeWebhookEvent>;
  const tenantId = parsed.data?.object?.tenantId;
  if (
    !parsed ||
    typeof parsed.id !== "string" ||
    (parsed.type !== "checkout.session.completed" && parsed.type !== "invoice.paid") ||
    typeof parsed.createdAt !== "string" ||
    !tenantId
  ) {
    throw new Error("Invalid Stripe webhook event payload.");
  }

  return {
    id: parsed.id,
    type: parsed.type,
    createdAt: parsed.createdAt,
    data: {
      object: {
        tenantId,
        checkoutId: parsed.data?.object?.checkoutId,
        planId: parsed.data?.object?.planId,
        seatCount: parsed.data?.object?.seatCount,
        invoiceId: parsed.data?.object?.invoiceId,
        amount: parsed.data?.object?.amount
      }
    }
  };
}

function buildWebhookSummary(event: StripeWebhookEvent) {
  if (event.type === "checkout.session.completed") {
    const plan = resolvePlan(event.data.object.planId ?? "starter");
    const seatCount = Math.max(event.data.object.seatCount ?? 1, 1);
    return `Checkout completed for ${plan.name} with ${seatCount} ${seatCount === 1 ? "seat" : "seats"}.`;
  }

  const amount = event.data.object.amount ?? 0;
  const invoiceId = event.data.object.invoiceId ?? "pending invoice";
  return `Invoice ${invoiceId} marked paid for ${new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(amount)}.`;
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
    paymentMethodSetup: state?.paymentMethodSetup ?? null,
    latestInvoiceStatus: state?.latestInvoiceStatus ?? "Pending",
    processedWebhookCount: state?.processedWebhookCount ?? 0,
    duplicateWebhookCount: state?.duplicateWebhookCount ?? 0,
    webhookActivity: state?.webhookActivity ?? []
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

  const state = getBillingState(session.tenantId);
  saveBillingState(session.tenantId, {
    ...state,
    paymentMethod
  });

  return {
    paymentMethod,
    persistedToDatabase: false
  };
}

export function createSignedStripeWebhookPayload(event: StripeWebhookEvent) {
  const payload = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  return {
    payload,
    signature: `t=${timestamp},v1=${createStripeSignature(payload, timestamp)}`
  };
}

export async function processStripeWebhookPayload(
  payload: string,
  signatureHeader: string | null
): Promise<{
  deliveryStatus: BillingWebhookDeliveryStatus;
  activity: BillingWebhookActivity;
  tenantId: string;
}> {
  if (!verifyStripeSignature(payload, signatureHeader)) {
    throw new Error("Stripe signature verification failed.");
  }

  const event = parseWebhookEvent(payload);
  const state = getBillingState(event.data.object.tenantId);
  const duplicate = state.processedWebhookIds.includes(event.id);

  if (duplicate) {
    const duplicateActivity: BillingWebhookActivity = {
      eventId: event.id,
      eventType: event.type,
      deliveryStatus: "Duplicate",
      receivedAt: new Date().toISOString(),
      summary: `Duplicate delivery ignored for ${event.type}.`
    };

    saveBillingState(event.data.object.tenantId, {
      ...state,
      duplicateWebhookCount: state.duplicateWebhookCount + 1,
      webhookActivity: [duplicateActivity, ...state.webhookActivity].slice(0, 8)
    });

    return {
      deliveryStatus: "Duplicate",
      activity: duplicateActivity,
      tenantId: event.data.object.tenantId
    };
  }

  let nextCheckout = state.checkout;
  let nextInvoiceStatus = state.latestInvoiceStatus;

  if (event.type === "checkout.session.completed") {
    const planId = event.data.object.planId ?? state.checkout?.selectedPlanId ?? "starter";
    const plan = resolvePlan(planId);
    const seatCount = Math.max(event.data.object.seatCount ?? state.checkout?.seatCount ?? 1, 1);
    nextCheckout = {
      checkoutId: event.data.object.checkoutId ?? state.checkout?.checkoutId ?? `chk_${event.id.slice(4, 12)}`,
      checkoutUrl: state.checkout?.checkoutUrl ?? `/billing?checkout=ready&checkout_id=${event.id}`,
      selectedPlanId: plan.id,
      selectedPlanName: plan.name,
      seatCount,
      estimatedMonthlyTotal: calculateEstimatedMonthlyTotal(plan.id, seatCount),
      startedAt: event.createdAt,
      status: "ready"
    };
    nextInvoiceStatus = "Pending";
  }

  if (event.type === "invoice.paid") {
    nextInvoiceStatus = "Paid";
  }

  const activity: BillingWebhookActivity = {
    eventId: event.id,
    eventType: event.type,
    deliveryStatus: "Processed",
    receivedAt: new Date().toISOString(),
    summary: buildWebhookSummary(event)
  };

  saveBillingState(event.data.object.tenantId, {
    ...state,
    checkout: nextCheckout,
    latestInvoiceStatus: nextInvoiceStatus,
    processedWebhookCount: state.processedWebhookCount + 1,
    processedWebhookIds: [...state.processedWebhookIds, event.id],
    webhookActivity: [activity, ...state.webhookActivity].slice(0, 8),
    latestReplayableEvent: event
  });

  return {
    deliveryStatus: "Processed",
    activity,
    tenantId: event.data.object.tenantId
  };
}

export async function simulateStripeWebhookForSession(
  session: AppSession,
  input: { eventType: BillingWebhookEventType | "replay-last" }
): Promise<{
  deliveryStatus: BillingWebhookDeliveryStatus;
  eventId: string;
}> {
  if (!session.tenantId) {
    throw new Error("Tenant context is required.");
  }

  const state = getBillingState(session.tenantId);
  const now = new Date().toISOString();
  const replayableEvent = state.latestReplayableEvent;

  const event: StripeWebhookEvent =
    input.eventType === "replay-last"
      ? replayableEvent ?? (() => { throw new Error("No webhook delivery exists to replay yet."); })()
      : input.eventType === "checkout.session.completed"
        ? {
            id: `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            type: "checkout.session.completed",
            createdAt: now,
            data: {
              object: {
                tenantId: session.tenantId,
                checkoutId: state.checkout?.checkoutId ?? `chk_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
                planId: state.checkout?.selectedPlanId ?? "starter",
                seatCount: state.checkout?.seatCount ?? 1
              }
            }
          }
        : {
            id: `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
            type: "invoice.paid",
            createdAt: now,
            data: {
              object: {
                tenantId: session.tenantId,
                invoiceId: `in_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
                amount: state.checkout?.estimatedMonthlyTotal ?? calculateEstimatedMonthlyTotal("starter", 1)
              }
            }
          };

  const signed = createSignedStripeWebhookPayload(event);
  const result = await processStripeWebhookPayload(signed.payload, signed.signature);
  return {
    deliveryStatus: result.deliveryStatus,
    eventId: event.id
  };
}
