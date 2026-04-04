import Link from "next/link";
import { canManageTenantBilling } from "@/lib/auth/authorization";
import type { AppSession } from "@/lib/auth/session";
import type { BillingSnapshot } from "@/lib/billing/store";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(amount);
}

type DashboardBillingSummaryProps = {
  session: AppSession;
  snapshot: BillingSnapshot;
};

export function DashboardBillingSummary({ session, snapshot }: DashboardBillingSummaryProps) {
  const canManageBilling = canManageTenantBilling(session);

  return (
    <section className="dashboard-billing-card" data-testid="dashboard-billing-summary-card">
      <div className="dashboard-note-header">
        <div>
          <p className="dashboard-note-eyebrow">Billing summary</p>
          <h2>{snapshot.currentPlanName}</h2>
        </div>
        <span
          className={`dashboard-note-access ${canManageBilling ? "dashboard-note-access--editable" : "dashboard-note-access--readonly"}`}
          data-testid="dashboard-billing-summary-access"
        >
          {canManageBilling ? "Owner can manage billing" : "Visible to all tenant roles"}
        </span>
      </div>

      <p className="dashboard-note-copy">
        Plan, seat, and invoice status are visible here so every tenant user can confirm the current workspace billing
        context.
      </p>

      <div className="dashboard-billing-grid" data-testid="dashboard-billing-summary-grid">
        <article className="billing-summary-card">
          <span className="settings-label">Plan</span>
          <strong data-testid="dashboard-billing-plan">{snapshot.currentPlanName}</strong>
          <p>{snapshot.tenantName}</p>
        </article>
        <article className="billing-summary-card">
          <span className="settings-label">Seats</span>
          <strong data-testid="dashboard-billing-seats">{snapshot.seatCount}</strong>
          <p>Current configured seat count for this workspace.</p>
        </article>
        <article className="billing-summary-card">
          <span className="settings-label">Monthly total</span>
          <strong data-testid="dashboard-billing-total">{formatCurrency(snapshot.estimatedMonthlyTotal)}</strong>
          <p>{snapshot.invoices[0]?.status ?? "Open"} invoice in the current cycle.</p>
        </article>
      </div>

      <div className="dashboard-billing-footer">
        <div className="dashboard-billing-invoice-pill" data-testid="dashboard-billing-latest-invoice">
          Latest invoice: {snapshot.invoices[0]?.periodLabel ?? "Current billing cycle"}
        </div>
        <Link href="/billing" className="dashboard-billing-link" data-testid="dashboard-billing-link">
          {canManageBilling ? "Open billing" : "View billing overview"}
        </Link>
      </div>
    </section>
  );
}
