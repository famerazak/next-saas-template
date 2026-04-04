"use client";

import { useEffect, useState } from "react";
import { readStoredPaymentMethod, writeStoredPaymentMethod } from "@/lib/billing/browser";
import type { BillingPaymentMethod } from "@/lib/billing/store";

type PaymentMethodSessionResponse = {
  setup?: {
    setupId: string;
    setupUrl: string;
  };
  error?: string;
};

type BillingPaymentMethodCardProps = {
  tenantId: string;
  initialPaymentMethod: BillingPaymentMethod | null;
};

function formatExpiry(month: number, year: number) {
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

export function BillingPaymentMethodCard({ tenantId, initialPaymentMethod }: BillingPaymentMethodCardProps) {
  const [paymentMethod, setPaymentMethod] = useState<BillingPaymentMethod | null>(initialPaymentMethod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const stored = readStoredPaymentMethod(tenantId);
    if (stored) {
      setPaymentMethod(stored);
      return;
    }

    if (initialPaymentMethod) {
      writeStoredPaymentMethod(tenantId, initialPaymentMethod);
    }
  }, [initialPaymentMethod, tenantId]);

  async function startSetup() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/billing/payment-method/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const payload = (await response.json().catch(() => null)) as PaymentMethodSessionResponse | null;
    if (!response.ok || !payload?.setup) {
      setLoading(false);
      setError(payload?.error ?? "Could not open payment method setup.");
      return;
    }

    window.location.href = payload.setup.setupUrl;
  }

  return (
    <section
      className="billing-payment-card"
      data-testid="billing-payment-method-card"
      data-hydrated={hydrated ? "true" : "false"}
    >
      <div className="settings-header billing-ready-header">
        <div>
          <h2>Payment method</h2>
          <p className="auth-subtitle">
            Capture the billing card through a hosted setup step, then return to the billing page with the masked
            card on file.
          </p>
        </div>
        <span className={`security-status-badge ${paymentMethod ? "is-good" : "is-pending"}`}>
          {paymentMethod ? "Card on file" : "No card yet"}
        </span>
      </div>

      {paymentMethod ? (
        <div className="billing-payment-summary" data-testid="billing-payment-method-summary">
          <div>
            <span className="settings-label">Card</span>
            <strong data-testid="billing-payment-method-brand">
              {paymentMethod.brand} ending in {paymentMethod.last4}
            </strong>
            <p>
              Expires {formatExpiry(paymentMethod.expiryMonth, paymentMethod.expiryYear)} for{" "}
              {paymentMethod.cardholderName}
            </p>
          </div>
          <div>
            <span className="settings-label">Billing email</span>
            <strong data-testid="billing-payment-method-email">{paymentMethod.billingEmail}</strong>
            <p data-testid="billing-payment-method-updated-at">
              Updated {new Date(paymentMethod.updatedAt).toLocaleString("en-GB")}
            </p>
          </div>
        </div>
      ) : (
        <div className="billing-payment-empty" data-testid="billing-payment-method-empty">
          <strong>No saved card yet</strong>
          <p>Add a payment method so future billing and invoices have a default card on file.</p>
        </div>
      )}

      <div className="billing-payment-actions">
        <button
          type="button"
          className="billing-payment-button"
          onClick={startSetup}
          disabled={loading}
          data-testid="billing-payment-method-start-button"
        >
          {loading
            ? "Opening..."
            : paymentMethod
              ? "Update card details"
              : "Add card details"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="auth-error" data-testid="billing-payment-method-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
