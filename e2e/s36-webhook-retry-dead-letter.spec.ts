import crypto from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const STRIPE_WEBHOOK_SECRET = "whsec_local_dev";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

function signStripePayload(payload: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("S36: unauthenticated user is redirected from platform webhook jobs to login", async ({ page }) => {
  await page.goto("/platform/webhooks-jobs");
  await expect(page).toHaveURL(/\/login$/);
});

test("S36: non-platform user sees no-access UX on platform webhook jobs", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/platform/webhooks-jobs");

  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByText("Your role does not allow access to the platform operations area.")).toBeVisible();
});

test("S36: platform admin can inspect dead letters and retry failed delivery", async ({ page }) => {
  const payload = JSON.stringify({
    id: "evt_deadletter_retry_case",
    type: "invoice.paid",
    createdAt: new Date().toISOString(),
    data: {
      object: {
        tenantId: "tenant-example",
        invoiceId: "in_deadletter_case",
        amount: 415,
        forceFailure: true
      }
    }
  });

  const webhookResponse = await page.request.post("/api/billing/webhooks/stripe", {
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signStripePayload(payload)
    },
    data: payload
  });

  expect(webhookResponse.status()).toBe(400);

  await login(page, "platform-admin@example.com");
  await page.goto("/platform/webhooks-jobs");

  await expect(page.getByTestId("platform-webhooks-page")).toBeVisible();
  await expect(page.getByTestId("platform-webhook-pending-count")).toContainText("1 pending");
  await expect(page.getByTestId("platform-webhook-dead-letter-list")).toContainText("evt_deadletter_retry_case");
  await expect(page.getByTestId("platform-webhook-dead-letter-list")).toContainText(
    "Forced webhook handler failure for retry testing."
  );

  await page
    .getByTestId(/^platform-dead-letter-reason-input-/)
    .first()
    .fill("Stripe issue fixed and payload verified for replay.");
  const retryButton = page.getByTestId(/^platform-dead-letter-retry-/).first();
  await retryButton.click();

  await expect(page.getByTestId("platform-webhook-success")).toContainText(
    "Retried webhook evt_deadletter_retry_case for tenant-example."
  );
  await expect(page.getByTestId("platform-webhook-pending-count")).toContainText("0 pending");
  await expect(page.getByTestId("platform-webhook-empty")).toBeVisible();
  await expect(page.getByTestId("platform-webhook-retry-history-list")).toContainText("evt_deadletter_retry_case");
  await expect(page.getByTestId("platform-webhook-retry-history-list")).toContainText("Retried");
});
