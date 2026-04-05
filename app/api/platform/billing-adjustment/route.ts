import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canAccessPlatformAdminArea } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import {
  applyManualBillingAdjustmentForPlatformAdmin,
  hasKnownPlatformBillingSupportTenant,
  loadPlatformBillingSupportSnapshot,
  type PlatformBillingAdjustmentKind
} from "@/lib/platform/billing-support";

type PlatformBillingAdjustmentRequest = {
  tenantId?: string;
  ticketId?: string;
  kind?: string;
  amount?: number;
  reason?: string;
};

function parseText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseKind(value: unknown): PlatformBillingAdjustmentKind | null {
  if (typeof value !== "string") {
    return null;
  }

  switch (value.toLowerCase()) {
    case "service credit":
      return "Service credit";
    case "invoice correction":
      return "Invoice correction";
    default:
      return null;
  }
}

function parseAmount(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  if (value <= 0 || value > 100_000) {
    return null;
  }

  return Math.round(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canAccessPlatformAdminArea(session)) {
    return NextResponse.json({ error: "Only platform admins can run billing adjustments." }, { status: 403 });
  }

  let body: PlatformBillingAdjustmentRequest;
  try {
    body = (await request.json()) as PlatformBillingAdjustmentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const tenantId = parseText(body.tenantId);
  const ticketId = parseText(body.ticketId);
  const kind = parseKind(body.kind);
  const amount = parseAmount(body.amount);
  const reason = parseText(body.reason);

  if (!tenantId || !ticketId || !kind || amount === null) {
    return NextResponse.json(
      { error: "Tenant, ticket ID, adjustment type, and amount are required." },
      { status: 400 }
    );
  }

  if (!reason || reason.length < 8 || reason.length > 240) {
    return NextResponse.json(
      { error: "Enter an operator reason between 8 and 240 characters." },
      { status: 400 }
    );
  }

  const currentSnapshot = await loadPlatformBillingSupportSnapshot();
  if (!hasKnownPlatformBillingSupportTenant(tenantId, currentSnapshot)) {
    return NextResponse.json({ error: "Tenant not found in platform operations." }, { status: 404 });
  }

  try {
    const adjustment = await applyManualBillingAdjustmentForPlatformAdmin(tenantId, {
      ticketId,
      kind,
      amount,
      reason,
      actorEmail: session.email
    });

    await recordTenantAuditEventForSession(session, {
      tenantId,
      action: "platform.billing.adjusted",
      origin: "platform",
      summary: `Platform applied ${kind} ${formatCurrency(amount)} on ticket ${ticketId}.`,
      targetType: "billing_adjustment",
      targetId: adjustment.id,
      targetLabel: ticketId,
      metadata: {
        ticketId,
        kind,
        amount,
        reason,
        tenantId
      }
    });

    return NextResponse.json(
      {
        snapshot: await loadPlatformBillingSupportSnapshot(),
        adjustmentId: adjustment.id
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not apply manual billing adjustment." },
      { status: 400 }
    );
  }
}
