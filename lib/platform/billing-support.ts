import crypto from "node:crypto";
import { loadPlatformDashboardSnapshot, type PlatformTenantRecord } from "@/lib/platform/dashboard";

export type PlatformBillingAdjustmentKind = "Service credit" | "Invoice correction";
export type PlatformSupportActionKind = "Escalated" | "Needs customer reply" | "Resolved";

export type PlatformBillingAdjustmentRecord = {
  id: string;
  tenantId: string;
  ticketId: string;
  kind: PlatformBillingAdjustmentKind;
  amount: number;
  reason: string;
  actorEmail: string;
  createdAt: string;
};

export type PlatformSupportActionRecord = {
  id: string;
  tenantId: string;
  ticketId: string;
  action: PlatformSupportActionKind;
  reason: string;
  actorEmail: string;
  createdAt: string;
};

export type PlatformBillingSupportTenantRecord = PlatformTenantRecord & {
  billingAdjustments: PlatformBillingAdjustmentRecord[];
  latestBillingAdjustment: PlatformBillingAdjustmentRecord | null;
  supportActions: PlatformSupportActionRecord[];
  latestSupportAction: PlatformSupportActionRecord | null;
};

export type PlatformBillingSupportSnapshot = {
  tenantCount: number;
  totalBillingAdjustments: number;
  totalSupportActions: number;
  tenants: PlatformBillingSupportTenantRecord[];
};

type TenantPlatformOpsState = {
  billingAdjustments: PlatformBillingAdjustmentRecord[];
  supportActions: PlatformSupportActionRecord[];
};

type LocalPlatformBillingSupportStore = Map<string, TenantPlatformOpsState>;

declare global {
  // eslint-disable-next-line no-var
  var __localPlatformBillingSupportStore: LocalPlatformBillingSupportStore | undefined;
}

function getLocalStore(): LocalPlatformBillingSupportStore {
  if (!globalThis.__localPlatformBillingSupportStore) {
    globalThis.__localPlatformBillingSupportStore = new Map<string, TenantPlatformOpsState>();
  }

  return globalThis.__localPlatformBillingSupportStore;
}

function getTenantPlatformOpsState(tenantId: string): TenantPlatformOpsState {
  const store = getLocalStore();
  const existing = store.get(tenantId);
  if (existing) {
    return existing;
  }

  const fresh: TenantPlatformOpsState = {
    billingAdjustments: [],
    supportActions: []
  };
  store.set(tenantId, fresh);
  return fresh;
}

function saveTenantPlatformOpsState(tenantId: string, state: TenantPlatformOpsState) {
  getLocalStore().set(tenantId, state);
  return state;
}

function recentFirst<T extends { createdAt: string }>(entries: T[]) {
  return [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function loadPlatformBillingSupportSnapshot(): Promise<PlatformBillingSupportSnapshot> {
  const dashboard = await loadPlatformDashboardSnapshot();

  const tenants = dashboard.tenants.map((tenant) => hydrateTenantRecord(tenant));

  return {
    tenantCount: tenants.length,
    totalBillingAdjustments: tenants.reduce((total, tenant) => total + tenant.billingAdjustments.length, 0),
    totalSupportActions: tenants.reduce((total, tenant) => total + tenant.supportActions.length, 0),
    tenants
  };
}

function hydrateTenantRecord(tenant: PlatformTenantRecord): PlatformBillingSupportTenantRecord {
  const state = getTenantPlatformOpsState(tenant.tenantId);
  const billingAdjustments = recentFirst(state.billingAdjustments);
  const supportActions = recentFirst(state.supportActions);

  return {
    ...tenant,
    billingAdjustments,
    latestBillingAdjustment: billingAdjustments[0] ?? null,
    supportActions,
    latestSupportAction: supportActions[0] ?? null
  };
}

export function hasKnownPlatformBillingSupportTenant(tenantId: string, snapshot: PlatformBillingSupportSnapshot): boolean {
  return snapshot.tenants.some((tenant) => tenant.tenantId === tenantId);
}

export async function applyManualBillingAdjustmentForPlatformAdmin(
  tenantId: string,
  input: {
    ticketId: string;
    kind: PlatformBillingAdjustmentKind;
    amount: number;
    reason: string;
    actorEmail: string;
  }
): Promise<PlatformBillingAdjustmentRecord> {
  const adjustment: PlatformBillingAdjustmentRecord = {
    id: `padj_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    tenantId,
    ticketId: input.ticketId,
    kind: input.kind,
    amount: input.amount,
    reason: input.reason,
    actorEmail: input.actorEmail,
    createdAt: new Date().toISOString()
  };

  const state = getTenantPlatformOpsState(tenantId);
  saveTenantPlatformOpsState(tenantId, {
    ...state,
    billingAdjustments: [adjustment, ...state.billingAdjustments].slice(0, 25)
  });

  return adjustment;
}

export async function recordPlatformSupportActionForPlatformAdmin(
  tenantId: string,
  input: {
    ticketId: string;
    action: PlatformSupportActionKind;
    reason: string;
    actorEmail: string;
  }
): Promise<PlatformSupportActionRecord> {
  const supportAction: PlatformSupportActionRecord = {
    id: `psup_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    tenantId,
    ticketId: input.ticketId,
    action: input.action,
    reason: input.reason,
    actorEmail: input.actorEmail,
    createdAt: new Date().toISOString()
  };

  const state = getTenantPlatformOpsState(tenantId);
  saveTenantPlatformOpsState(tenantId, {
    ...state,
    supportActions: [supportAction, ...state.supportActions].slice(0, 25)
  });

  return supportAction;
}
