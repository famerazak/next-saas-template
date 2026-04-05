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

test("S45: tenant admins can see platform retry actions with reason metadata", async ({ page }) => {
  const payload = JSON.stringify({
    id: "evt_platform_audit_retry_case",
    type: "invoice.paid",
    createdAt: new Date().toISOString(),
    data: {
      object: {
        tenantId: "tenant-example",
        invoiceId: "in_platform_audit_case",
        amount: 522,
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

  const retryReason = "Stripe endpoint recovered after signature verification fix.";
  await page
    .getByTestId(/^platform-dead-letter-reason-input-/)
    .first()
    .fill(retryReason);
  await page.getByTestId(/^platform-dead-letter-retry-/).first().click();
  await expect(page.getByTestId("platform-webhook-success")).toContainText("evt_platform_audit_retry_case");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

  await login(page, "admin@example.com");
  await page.goto("/audit-logs");

  await expect(page.getByTestId("audit-log-console")).toBeVisible();
  await expect(page.getByTestId("audit-log-list")).toContainText("Platform retried webhook evt_platform_audit_retry_case.");
  await expect(page.getByTestId("audit-log-list")).toContainText("platform-admin@example.com");
  await expect(page.getByTestId("audit-log-list")).toContainText("platform.webhook.retry");
  await expect(page.getByTestId("audit-log-list")).toContainText("invoice.paid");
  await expect(page.getByTestId("audit-log-list")).toContainText(`Reason: ${retryReason}`);
});
