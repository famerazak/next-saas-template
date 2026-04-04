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

test("S35: invalid stripe webhook signature is rejected", async ({ request }) => {
  const payload = JSON.stringify({
    id: "evt_invalid_signature",
    type: "checkout.session.completed",
    createdAt: new Date().toISOString(),
    data: {
      object: {
        tenantId: "tenant-example",
        checkoutId: "chk_invalid",
        planId: "starter",
        seatCount: 1
      }
    }
  });

  const response = await request.post("/api/billing/webhooks/stripe", {
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "t=1,v1=invalid"
    },
    data: payload
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  const body = await response.json();
  expect(body.error).toContain("Stripe signature verification failed");
});

test("S35: signed webhook updates billing state and duplicate replay is ignored", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/billing");

  await page.getByTestId("billing-plan-select").selectOption("growth");
  await page.getByTestId("billing-seat-count-input").fill("12");
  await page.getByTestId("billing-start-checkout-button").click();
  await expect(page.getByTestId("billing-checkout-success")).toContainText("Checkout session started.");

  const payload = JSON.stringify({
    id: "evt_checkout_growth_12",
    type: "checkout.session.completed",
    createdAt: new Date().toISOString(),
    data: {
      object: {
        tenantId: "tenant-example",
        checkoutId: "chk_from_webhook",
        planId: "growth",
        seatCount: 12
      }
    }
  });

  const response = await page.request.post("/api/billing/webhooks/stripe", {
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signStripePayload(payload)
    },
    data: payload
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.deliveryStatus).toBe("Processed");

  await page.reload();
  await expect(page.getByTestId("billing-webhook-monitor-card")).toBeVisible();
  await expect(page.getByTestId("billing-webhook-processed-count")).toHaveText("1");
  await expect(page.getByTestId("billing-webhook-duplicate-count")).toHaveText("0");
  await expect(page.getByTestId("billing-webhook-activity-list")).toContainText("checkout.session.completed");
  await expect(page.getByTestId("billing-webhook-activity-list")).toContainText("Growth");
  await expect(page.getByTestId("billing-webhook-invoice-status")).toHaveText("Pending");

  await page.getByTestId("billing-webhook-invoice-button").click();
  await expect(page.getByTestId("billing-webhook-success")).toContainText("Webhook processed: invoice.paid.");
  await expect(page.getByTestId("billing-webhook-processed-count")).toHaveText("2");
  await expect(page.getByTestId("billing-webhook-invoice-status")).toHaveText("Paid");
  await expect(page.getByTestId("billing-webhook-activity-list")).toContainText("invoice.paid");

  await page.getByTestId("billing-webhook-replay-button").click();
  await expect(page.getByTestId("billing-webhook-success")).toContainText("Duplicate delivery ignored.");
  await expect(page.getByTestId("billing-webhook-processed-count")).toHaveText("2");
  await expect(page.getByTestId("billing-webhook-duplicate-count")).toHaveText("1");
  await expect(page.getByTestId("billing-webhook-activity-list")).toContainText("Duplicate");
});
