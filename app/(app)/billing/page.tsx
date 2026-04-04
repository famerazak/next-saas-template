import { redirect } from "next/navigation";
import { BillingCheckoutCard } from "@/components/billing-checkout-card";
import { BillingInvoicesList } from "@/components/billing-invoices-list";
import { BillingPaymentMethodCard } from "@/components/billing-payment-method-card";
import { BillingWebhookMonitorCard } from "@/components/billing-webhook-monitor-card";
import { NoAccessCard } from "@/components/no-access-card";
import { canManageTenantBilling } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadBillingSnapshotForSession } from "@/lib/billing/store";
import { loadTeamMembersForSession } from "@/lib/team/store";

export default async function BillingPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  if (!canManageTenantBilling(session)) {
    return <NoAccessCard areaName="billing" />;
  }

  const members = await loadTeamMembersForSession(session);
  const snapshot = await loadBillingSnapshotForSession(session, {
    recommendedSeatCount: members.length
  });

  return (
    <main className="page-shell">
      <div className="billing-stack">
        <BillingCheckoutCard
          tenantName={snapshot.tenantName}
          billingOwnerEmail={snapshot.billingOwnerEmail}
          initialSeatCount={snapshot.seatCount}
          initialCurrentPlanName={snapshot.currentPlanName}
          initialEstimatedMonthlyTotal={snapshot.estimatedMonthlyTotal}
          availablePlans={snapshot.availablePlans}
          initialCheckout={snapshot.checkout}
        />
        <BillingPaymentMethodCard
          tenantId={snapshot.tenantId || snapshot.billingOwnerEmail}
          initialPaymentMethod={snapshot.paymentMethod}
        />
        <BillingWebhookMonitorCard initialSnapshot={snapshot} />
        <BillingInvoicesList invoices={snapshot.invoices} />
      </div>
    </main>
  );
}
