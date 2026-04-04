import type { BillingInvoice } from "@/lib/billing/store";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatIssuedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function invoiceTone(status: BillingInvoice["status"]) {
  switch (status) {
    case "Paid":
      return "is-good";
    case "Open":
      return "is-pending";
    default:
      return "is-neutral";
  }
}

type BillingInvoicesListProps = {
  invoices: BillingInvoice[];
};

export function BillingInvoicesList({ invoices }: BillingInvoicesListProps) {
  return (
    <section className="billing-invoices-card" data-testid="billing-invoices-card">
      <div className="settings-header billing-ready-header">
        <div>
          <h2>Recent invoices</h2>
          <p className="auth-subtitle">
            A visible invoice history stub for the starter so owners can validate plan totals and recent billing
            states before real Stripe sync lands.
          </p>
        </div>
        <span className="security-status-badge is-neutral">{invoices.length} invoices</span>
      </div>

      <div className="billing-invoices-list" data-testid="billing-invoices-list">
        {invoices.map((invoice) => (
          <article className="billing-invoice-row" key={invoice.invoiceId} data-testid={`billing-invoice-${invoice.invoiceId}`}>
            <div>
              <span className="settings-label">{invoice.periodLabel}</span>
              <strong>{invoice.lineItemSummary}</strong>
              <p>{formatIssuedAt(invoice.issuedAt)}</p>
            </div>
            <div className="billing-invoice-meta">
              <span className={`security-status-badge ${invoiceTone(invoice.status)}`}>{invoice.status}</span>
              <strong data-testid={`billing-invoice-amount-${invoice.invoiceId}`}>{formatCurrency(invoice.amount)}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
