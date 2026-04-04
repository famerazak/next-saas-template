"use client";

import { FormEvent, useEffect, useState } from "react";
import { writeStoredPaymentMethod } from "@/lib/billing/browser";
import type { BillingPaymentMethod } from "@/lib/billing/store";

type PaymentMethodSetupFormProps = {
  setupId: string;
  tenantId: string;
  tenantName: string;
  ownerEmail: string;
};

type ConfirmPaymentMethodResponse = {
  paymentMethod?: BillingPaymentMethod;
  returnUrl?: string;
  error?: string;
};

export function PaymentMethodSetupForm({ setupId, tenantId, tenantName, ownerEmail }: PaymentMethodSetupFormProps) {
  const [cardholderName, setCardholderName] = useState("Taylor Owner");
  const [billingEmail, setBillingEmail] = useState(ownerEmail);
  const [cardNumber, setCardNumber] = useState("4242424242424242");
  const [expiryMonth, setExpiryMonth] = useState("12");
  const [expiryYear, setExpiryYear] = useState(String(new Date().getFullYear() + 1));
  const [cvc, setCvc] = useState("123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/billing/payment-method/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        setupId,
        cardholderName,
        billingEmail,
        cardNumber,
        expiryMonth: Number.parseInt(expiryMonth, 10),
        expiryYear: Number.parseInt(expiryYear, 10),
        cvc
      })
    });

    const payload = (await response.json().catch(() => null)) as ConfirmPaymentMethodResponse | null;
    if (!response.ok || !payload?.returnUrl) {
      setLoading(false);
      setError(payload?.error ?? "Could not save payment method.");
      return;
    }

    if (payload.paymentMethod) {
      writeStoredPaymentMethod(tenantId, payload.paymentMethod);
    }

    window.location.href = payload.returnUrl;
  }

  return (
    <main className="page-shell">
      <section
        className="auth-card settings-card payment-setup-card"
        data-testid="payment-method-setup-page"
        data-hydrated={hydrated ? "true" : "false"}
      >
        <div className="settings-header">
          <div>
            <h1>Secure card setup</h1>
            <p className="auth-subtitle">
              This hosted setup step simulates the Stripe card capture handoff for {tenantName}. Save the card here and
              return to billing with the masked payment method on file.
            </p>
          </div>
          <span className="security-status-badge is-neutral">Setup session</span>
        </div>

        <div className="billing-summary-grid payment-setup-summary">
          <article className="billing-summary-card">
            <span className="settings-label">Setup ID</span>
            <strong data-testid="payment-method-setup-id">{setupId}</strong>
            <p>Use this as the handoff identifier when you later swap this flow to Stripe.</p>
          </article>
          <article className="billing-summary-card">
            <span className="settings-label">Tenant</span>
            <strong>{tenantName}</strong>
            <p>Only the workspace owner can complete this card step.</p>
          </article>
          <article className="billing-summary-card">
            <span className="settings-label">Owner email</span>
            <strong>{ownerEmail}</strong>
            <p>The billing email can be updated below before saving the card.</p>
          </article>
        </div>

        <form className="auth-form payment-setup-form" onSubmit={handleSubmit}>
          <div className="payment-setup-grid">
            <label htmlFor="cardholderName">
              Cardholder name
              <input
                id="cardholderName"
                name="cardholderName"
                type="text"
                data-testid="payment-method-cardholder-input"
                value={cardholderName}
                onChange={(event) => setCardholderName(event.target.value)}
              />
            </label>
            <label htmlFor="billingEmail">
              Billing email
              <input
                id="billingEmail"
                name="billingEmail"
                type="email"
                data-testid="payment-method-email-input"
                value={billingEmail}
                onChange={(event) => setBillingEmail(event.target.value)}
              />
            </label>
            <label htmlFor="cardNumber">
              Card number
              <input
                id="cardNumber"
                name="cardNumber"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                data-testid="payment-method-card-number-input"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
              />
            </label>
            <label htmlFor="cvc">
              CVC
              <input
                id="cvc"
                name="cvc"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                data-testid="payment-method-cvc-input"
                value={cvc}
                onChange={(event) => setCvc(event.target.value)}
              />
            </label>
            <label htmlFor="expiryMonth">
              Expiry month
              <input
                id="expiryMonth"
                name="expiryMonth"
                type="number"
                min={1}
                max={12}
                data-testid="payment-method-expiry-month-input"
                value={expiryMonth}
                onChange={(event) => setExpiryMonth(event.target.value)}
              />
            </label>
            <label htmlFor="expiryYear">
              Expiry year
              <input
                id="expiryYear"
                name="expiryYear"
                type="number"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 20}
                data-testid="payment-method-expiry-year-input"
                value={expiryYear}
                onChange={(event) => setExpiryYear(event.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p role="alert" className="auth-error" data-testid="payment-method-setup-error">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loading} data-testid="payment-method-save-button">
            {loading ? "Saving..." : "Save card and return to billing"}
          </button>
        </form>
      </section>
    </main>
  );
}
