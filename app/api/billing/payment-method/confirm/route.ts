import { NextResponse } from "next/server";
import { recordTenantAuditEventForSession } from "@/lib/audit/store";
import { canManageTenantBilling } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { savePaymentMethodForSession } from "@/lib/billing/store";

type ConfirmPaymentMethodRequest = {
  setupId?: string;
  cardholderName?: string;
  billingEmail?: string;
  cardNumber?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvc?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = value.trim();
  if (!parsed || parsed.length > maxLength) {
    return null;
  }

  return parsed;
}

function parseBillingEmail(value: unknown): string | null {
  const parsed = parseString(value, 160)?.toLowerCase() ?? null;
  if (!parsed || !EMAIL_PATTERN.test(parsed)) {
    return null;
  }
  return parsed;
}

function parseCardNumber(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const digits = value.replace(/\D+/g, "");
  if (digits.length < 15 || digits.length > 16) {
    return null;
  }

  return digits;
}

function parseCvc(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const digits = value.replace(/\D+/g, "");
  if (digits.length < 3 || digits.length > 4) {
    return null;
  }

  return digits;
}

function parseExpiryMonth(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 12) {
    return null;
  }

  return value;
}

function parseExpiryYear(value: unknown): number | null {
  const currentYear = new Date().getFullYear();
  if (typeof value !== "number" || !Number.isInteger(value) || value < currentYear || value > currentYear + 20) {
    return null;
  }

  return value;
}

function isExpired(month: number, year: number): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  return year < currentYear || (year === currentYear && month < currentMonth);
}

export async function POST(request: Request) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canManageTenantBilling(session)) {
    return NextResponse.json({ error: "Only the tenant owner can manage billing." }, { status: 403 });
  }

  let body: ConfirmPaymentMethodRequest;
  try {
    body = (await request.json()) as ConfirmPaymentMethodRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const setupId = parseString(body.setupId, 80);
  const cardholderName = parseString(body.cardholderName, 120);
  const billingEmail = parseBillingEmail(body.billingEmail);
  const cardNumber = parseCardNumber(body.cardNumber);
  const cvc = parseCvc(body.cvc);
  const expiryMonth = parseExpiryMonth(body.expiryMonth);
  const expiryYear = parseExpiryYear(body.expiryYear);

  if (!setupId || !cardholderName || !billingEmail || !cardNumber || !cvc || !expiryMonth || !expiryYear) {
    return NextResponse.json(
      { error: "Complete the full card form before saving the payment method." },
      { status: 400 }
    );
  }

  if (isExpired(expiryMonth, expiryYear)) {
    return NextResponse.json({ error: "Enter a card expiry date in the future." }, { status: 400 });
  }

  try {
    const saved = await savePaymentMethodForSession(session, {
      setupId,
      cardholderName,
      billingEmail,
      cardNumber,
      expiryMonth,
      expiryYear
    });
    await recordTenantAuditEventForSession(session, {
      action: "billing.payment_method.updated",
      summary: `Updated billing card ending in ${saved.paymentMethod.last4}.`,
      targetType: "payment_method",
      targetId: saved.paymentMethod.paymentMethodId,
      targetLabel: `${saved.paymentMethod.brand} •••• ${saved.paymentMethod.last4}`,
      metadata: {
        cardBrand: saved.paymentMethod.brand,
        last4: saved.paymentMethod.last4,
        billingEmail: saved.paymentMethod.billingEmail
      }
    });

    return NextResponse.json(
      {
        paymentMethod: saved.paymentMethod,
        returnUrl: "/billing?payment_method=updated",
        persistence: saved.persistedToDatabase ? "database" : "local"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save payment method." },
      { status: 400 }
    );
  }
}
