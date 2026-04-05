import { createClient } from "@supabase/supabase-js";
import type { TeamMember } from "@/lib/team/store";
import { loadPlatformTenantMembershipsFromLocalStore } from "@/lib/team/store";
import { loadPlatformTenantSettingsFromLocalStore } from "@/lib/tenant/settings";
import { loadPlatformBillingSnapshotsFromLocalStore } from "@/lib/billing/store";

type TenantRow = {
  id: string;
  name: string;
  dashboard_note: string | null;
  updated_at: string | null;
};

type MembershipRow = {
  tenant_id: string;
  user_id: string;
  role: string;
};

type PlatformTenantBillingView = {
  currentPlanName: string;
  seatCount: number;
  estimatedMonthlyTotal: number;
  latestInvoiceStatus: string;
  processedWebhookCount: number;
  duplicateWebhookCount: number;
  pendingDeadLetters: number;
  invoiceCount: number;
  paymentMethodSummary: string | null;
};

export type PlatformTenantRecord = {
  tenantId: string;
  tenantName: string;
  dashboardNote: string;
  updatedAt: string | null;
  members: TeamMember[];
  memberCount: number;
  adminCount: number;
  ownerEmail: string;
  status: "Attention" | "Active billing" | "Trial";
  billing: PlatformTenantBillingView;
};

export type PlatformDashboardSnapshot = {
  tenantCount: number;
  memberCount: number;
  attentionCount: number;
  activeBillingCount: number;
  tenants: PlatformTenantRecord[];
};

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || process.env.E2E_AUTH_BYPASS === "1") {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function normalizeRole(value: string | null | undefined): TeamMember["role"] {
  switch ((value || "").toLowerCase()) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "viewer":
      return "Viewer";
    default:
      return "Member";
  }
}

function fallbackTenantName(tenantId: string) {
  return tenantId.replace(/^tenant-/, "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Workspace";
}

function deriveTenantStatus(input: PlatformTenantBillingView): PlatformTenantRecord["status"] {
  if (input.pendingDeadLetters > 0) {
    return "Attention";
  }

  if (
    input.currentPlanName !== "Starter Trial" ||
    input.latestInvoiceStatus === "Paid" ||
    input.processedWebhookCount > 0 ||
    input.paymentMethodSummary !== null
  ) {
    return "Active billing";
  }

  return "Trial";
}

function defaultBillingSnapshot(): PlatformTenantBillingView {
  return {
    currentPlanName: "Starter Trial",
    seatCount: 1,
    estimatedMonthlyTotal: 91,
    latestInvoiceStatus: "Pending",
    processedWebhookCount: 0,
    duplicateWebhookCount: 0,
    pendingDeadLetters: 0,
    invoiceCount: 0,
    paymentMethodSummary: null
  };
}

async function loadTenantsFromDatabase(): Promise<Map<string, { tenantName: string; dashboardNote: string; updatedAt: string | null; members: TeamMember[] }>> {
  const supabase = getServiceClient();
  if (!supabase) {
    return new Map();
  }

  const [{ data: tenants }, { data: memberships }] = await Promise.all([
    supabase.from("tenants").select("id, name, dashboard_note, updated_at").returns<TenantRow[]>(),
    supabase.from("memberships").select("tenant_id, user_id, role").returns<MembershipRow[]>()
  ]);

  const users = new Map<string, { email: string; fullName: string }>();
  const membershipRows = memberships ?? [];
  await Promise.all(
    [...new Set(membershipRows.map((row) => row.user_id))].map(async (userId) => {
      try {
        const result = await supabase.auth.admin.getUserById(userId);
        users.set(userId, {
          email: result.data.user?.email ?? userId,
          fullName: (result.data.user?.user_metadata?.full_name as string | undefined) ?? ""
        });
      } catch {
        users.set(userId, {
          email: userId,
          fullName: ""
        });
      }
    })
  );

  const tenantsMap = new Map<string, { tenantName: string; dashboardNote: string; updatedAt: string | null; members: TeamMember[] }>();
  for (const tenant of tenants ?? []) {
    tenantsMap.set(tenant.id, {
      tenantName: tenant.name || fallbackTenantName(tenant.id),
      dashboardNote: tenant.dashboard_note || "",
      updatedAt: tenant.updated_at,
      members: []
    });
  }

  for (const membership of membershipRows) {
    const existing = tenantsMap.get(membership.tenant_id);
    const user = users.get(membership.user_id);
    const member: TeamMember = {
      id: membership.user_id,
      email: user?.email ?? membership.user_id,
      fullName: user?.fullName ?? "",
      role: normalizeRole(membership.role),
      status: "Active"
    };

    if (existing) {
      existing.members.push(member);
    } else {
      tenantsMap.set(membership.tenant_id, {
        tenantName: fallbackTenantName(membership.tenant_id),
        dashboardNote: "",
        updatedAt: null,
        members: [member]
      });
    }
  }

  return tenantsMap;
}

export async function loadPlatformDashboardSnapshot(): Promise<PlatformDashboardSnapshot> {
  const localTeams = loadPlatformTenantMembershipsFromLocalStore();
  const localSettings = loadPlatformTenantSettingsFromLocalStore();
  const localBilling = loadPlatformBillingSnapshotsFromLocalStore();
  const dbTenants = await loadTenantsFromDatabase();

  const tenantIds = new Set<string>();
  for (const team of localTeams) tenantIds.add(team.tenantId);
  for (const tenant of localSettings) tenantIds.add(tenant.tenantId);
  for (const billing of localBilling) tenantIds.add(billing.tenantId);
  for (const tenantId of dbTenants.keys()) tenantIds.add(tenantId);

  const records = [...tenantIds]
    .map((tenantId) => {
      const dbTenant = dbTenants.get(tenantId);
      const localTeam = localTeams.find((entry) => entry.tenantId === tenantId);
      const localTenant = localSettings.find((entry) => entry.tenantId === tenantId);
      const localBillingSnapshot = localBilling.find((entry) => entry.tenantId === tenantId);
      const members = dbTenant?.members.length ? dbTenant.members : localTeam?.members ?? [];
      const billing = localBillingSnapshot
        ? {
            currentPlanName: localBillingSnapshot.currentPlanName,
            seatCount: localBillingSnapshot.seatCount,
            estimatedMonthlyTotal: localBillingSnapshot.estimatedMonthlyTotal,
            latestInvoiceStatus: localBillingSnapshot.latestInvoiceStatus,
            processedWebhookCount: localBillingSnapshot.processedWebhookCount,
            duplicateWebhookCount: localBillingSnapshot.duplicateWebhookCount,
            pendingDeadLetters: localBillingSnapshot.pendingDeadLetters,
            invoiceCount: localBillingSnapshot.invoices.length,
            paymentMethodSummary: localBillingSnapshot.paymentMethodSummary
          }
        : defaultBillingSnapshot();
      const ownerEmail = members.find((member) => member.role === "Owner")?.email ?? "";
      const adminCount = members.filter((member) => member.role === "Owner" || member.role === "Admin").length;

      return {
        tenantId,
        tenantName: dbTenant?.tenantName || localTenant?.tenantName || localTeam?.tenantName || fallbackTenantName(tenantId),
        dashboardNote: dbTenant?.dashboardNote || localTenant?.dashboardNote || "",
        updatedAt: dbTenant?.updatedAt || localTenant?.updatedAt || null,
        members,
        memberCount: members.length,
        adminCount,
        ownerEmail,
        status: deriveTenantStatus(billing),
        billing
      } satisfies PlatformTenantRecord;
    })
    .sort((left, right) => left.tenantName.localeCompare(right.tenantName));

  return {
    tenantCount: records.length,
    memberCount: records.reduce((total, tenant) => total + tenant.memberCount, 0),
    attentionCount: records.filter((tenant) => tenant.status === "Attention").length,
    activeBillingCount: records.filter((tenant) => tenant.status === "Active billing").length,
    tenants: records
  };
}
