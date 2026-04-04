"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { BillingCheckout, BillingPlan, BillingPlanId } from "@/lib/billing/store";

type BillingCheckoutCardProps = {
  tenantName: string;
  billingOwnerEmail: string;
  initialSeatCount: number;
  initialCurrentPlanName: string;
  initialEstimatedMonthlyTotal: number;
  availablePlans: BillingPlan[];
  initialCheckout: BillingCheckout | null;
};

type CheckoutResponse = {
  checkout?: BillingCheckout;
  error?: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatStartedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function BillingCheckoutCard({
  tenantName,
  billingOwnerEmail,
  initialSeatCount,
  initialCurrentPlanName,
  initialEstimatedMonthlyTotal,
  availablePlans,
  initialCheckout
}: BillingCheckoutCardProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<BillingPlanId>(initialCheckout?.selectedPlanId ?? "starter");
  const [seatCount, setSeatCount] = useState(String(initialCheckout?.seatCount ?? initialSeatCount));
  const [checkout, setCheckout] = useState<BillingCheckout | null>(initialCheckout);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === selectedPlanId) ?? availablePlans[0],
    [availablePlans, selectedPlanId]
  );

  const parsedSeats = Number.parseInt(seatCount, 10);
  const normalizedSeatCount = Number.isFinite(parsedSeats) && parsedSeats > 0 ? parsedSeats : 1;
  const estimatedMonthlyTotal = selectedPlan.monthlyBase + selectedPlan.monthlyPerSeat * normalizedSeatCount;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        selectedPlanId,
        seatCount: normalizedSeatCount
      })
    });

    const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;
    if (!response.ok || !payload?.checkout) {
      setLoading(false);
      setError(payload?.error ?? "Could not start checkout.");
      return;
    }

    setCheckout(payload.checkout);
    setLoading(false);
    setSuccess("Checkout session started.");
  }

  return (
    <section className="billing-card" data-testid="billing-page" data-hydrated={hydrated ? "true" : "false"}>
      <div className="settings-header">
        <div>
          <h1>Billing</h1>
          <p className="auth-subtitle">
            Owner-only billing controls for {tenantName}. Start plan and seat checkout here before wiring a real
            Stripe handoff in the next billing slices.
          </p>
        </div>
        <div className="billing-owner-pill" data-testid="billing-owner-pill">
          Billing owner: {billingOwnerEmail}
        </div>
      </div>

      <div className="billing-summary-grid" data-testid="billing-summary-grid">
        <article className="billing-summary-card">
          <span className="settings-label">Current plan</span>
          <strong data-testid="billing-current-plan">{checkout?.selectedPlanName ?? initialCurrentPlanName}</strong>
          <p>{checkout ? "Pending checkout is ready for confirmation." : "No hosted checkout started yet."}</p>
        </article>
        <article className="billing-summary-card">
          <span className="settings-label">Seat baseline</span>
          <strong data-testid="billing-seat-baseline">{initialSeatCount} seats</strong>
          <p>We recommend starting from your active team size.</p>
        </article>
        <article className="billing-summary-card">
          <span className="settings-label">Estimated monthly total</span>
          <strong data-testid="billing-estimated-total">
            {formatCurrency(checkout?.estimatedMonthlyTotal ?? initialEstimatedMonthlyTotal)}
          </strong>
          <p>Estimate updates as you choose a plan and seat count.</p>
        </article>
      </div>

      <form className="billing-checkout-form" data-testid="billing-checkout-form" onSubmit={handleSubmit}>
        <div className="billing-plan-grid">
          {availablePlans.map((plan) => {
            const checked = selectedPlanId === plan.id;
            return (
              <article
                className={`billing-plan-option ${checked ? "is-selected" : ""}`}
                key={plan.id}
                data-testid={`billing-plan-${plan.id}`}
              >
                <div>
                  <strong>{plan.name}</strong>
                  <p>{plan.description}</p>
                </div>
                <span>
                  {formatCurrency(plan.monthlyBase)} + {formatCurrency(plan.monthlyPerSeat)}/seat
                </span>
              </article>
            );
          })}
        </div>

        <div className="billing-checkout-controls">
          <label htmlFor="billing-plan-select">
            Plan
            <select
              id="billing-plan-select"
              name="selectedPlanId"
              value={selectedPlanId}
              data-testid="billing-plan-select"
              onChange={(event) => setSelectedPlanId(event.currentTarget.value as BillingPlanId)}
            >
              {availablePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="billing-seat-count">
            Seats
            <input
              id="billing-seat-count"
              name="seatCount"
              type="number"
              min={1}
              max={250}
              inputMode="numeric"
              value={seatCount}
              data-testid="billing-seat-count-input"
              onInput={(event) => setSeatCount(event.currentTarget.value)}
            />
          </label>

          <div className="billing-estimate-card" data-testid="billing-live-estimate">
            <span className="settings-label">Live estimate</span>
            <strong>{formatCurrency(estimatedMonthlyTotal)}/month</strong>
            <p>
              {selectedPlan.name} for {normalizedSeatCount} {normalizedSeatCount === 1 ? "seat" : "seats"}
            </p>
          </div>

          <button type="submit" disabled={loading} data-testid="billing-start-checkout-button">
            {loading ? "Starting..." : "Start checkout"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="auth-error" data-testid="billing-checkout-error">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="auth-success" data-testid="billing-checkout-success">
            {success}
          </p>
        ) : null}
      </form>

      {checkout ? (
        <section className="billing-ready-card" data-testid="billing-checkout-ready-card">
          <div className="settings-header billing-ready-header">
            <div>
              <h2>Checkout session ready</h2>
              <p className="auth-subtitle">
                The starter has captured the selected plan and seats. Hook this checkout object into Stripe in S31.
              </p>
            </div>
            <span className="security-status-badge is-good">Ready</span>
          </div>
          <div className="billing-ready-grid">
            <div>
              <span className="settings-label">Checkout ID</span>
              <strong data-testid="billing-checkout-id">{checkout.checkoutId}</strong>
            </div>
            <div>
              <span className="settings-label">Started at</span>
              <strong>{formatStartedAt(checkout.startedAt)}</strong>
            </div>
            <div>
              <span className="settings-label">Plan</span>
              <strong data-testid="billing-checkout-plan">{checkout.selectedPlanName}</strong>
            </div>
            <div>
              <span className="settings-label">Seats</span>
              <strong data-testid="billing-checkout-seats">{checkout.seatCount}</strong>
            </div>
            <div>
              <span className="settings-label">Estimate</span>
              <strong data-testid="billing-checkout-total">{formatCurrency(checkout.estimatedMonthlyTotal)}</strong>
            </div>
            <div>
              <span className="settings-label">Checkout path</span>
              <strong className="billing-monospace" data-testid="billing-checkout-url">
                {checkout.checkoutUrl}
              </strong>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
