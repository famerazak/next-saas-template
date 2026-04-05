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

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
}

function signStripePayload(payload: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

async function seedTenant(page: Page, input: { ownerEmail: string; tenantName: string }) {
  await login(page, input.ownerEmail);
  await page.goto("/settings/tenant");
  await page.getByTestId("tenant-name-input").fill(input.tenantName);
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");
  await logout(page);
}

test("S56: unauthenticated user is redirected from platform compliance to login", async ({ page }) => {
  await page.goto("/platform/compliance");
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
});

test("S56: non-platform user sees no-access UX on platform compliance", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/platform/compliance");
  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByText("Your role does not allow access to the platform operations area.")).toBeVisible();
});

test("S56: platform admin can review audit and security signals, then retry a failed webhook from compliance explorer", async ({
  page
}) => {
  const ownerEmail = "owner@platformcompliance.com";
  const tenantName = "Platform Compliance Workspace";
  const ticketId = "SUP-5601";
  const auditReason = "Compliance escalation requested after billing review.";

  await seedTenant(page, { ownerEmail, tenantName });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform/billing-support");
  await page.getByTestId("platform-billing-support-search-input").fill(tenantName);
  const tenantCard = page.locator(".platform-tenant-card").filter({ hasText: tenantName }).first();
  await tenantCard.getByRole("button", { name: "Open detail" }).click();
  await page.getByTestId("platform-support-action-kind").selectOption("Escalated");
  await page.getByTestId("platform-support-ticket").fill(ticketId);
  await page.getByTestId("platform-support-reason").fill(auditReason);
  await page.getByTestId("platform-support-action-submit").click();
  await expect(page.getByTestId("platform-support-action-success")).toContainText(
    `Logged Escalated for ${tenantName} on ticket ${ticketId}.`
  );

  const payload = JSON.stringify({
    id: "evt_s56_deadletter_case",
    type: "invoice.paid",
    createdAt: new Date().toISOString(),
    data: {
      object: {
        tenantId: "tenant-example",
        invoiceId: "in_s56_deadletter_case",
        amount: 515,
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

  await page.goto("/platform");
  await page.getByTestId("platform-home-link-compliance").click();

  await expect(page).toHaveURL(/\/platform\/compliance$/, { timeout: 15_000 });
  await expect(page.getByTestId("platform-compliance-page")).toBeVisible();
  await expect(page.getByTestId("platform-compliance-audit-list")).toContainText(ticketId);
  await expect(page.getByTestId("platform-compliance-audit-list")).toContainText(auditReason);
  await expect(page.getByTestId("platform-compliance-security-list")).toContainText(ownerEmail);
  await expect(page.getByTestId("platform-compliance-security-list")).toContainText("2FA not enrolled");
  await expect(page.getByTestId("platform-webhook-dead-letter-list")).toContainText("evt_s56_deadletter_case");

  await page.getByTestId("platform-compliance-search-input").fill(ticketId);
  await expect(page.getByTestId("platform-compliance-audit-list")).toContainText(ticketId);
  await expect(page.getByTestId("platform-compliance-security-empty")).toBeVisible();

  await page.getByTestId("platform-compliance-search-input").fill("");
  await page
    .getByTestId(/^platform-dead-letter-reason-input-/)
    .first()
    .fill("Webhook payload reviewed and approved for replay.");
  await page.getByTestId(/^platform-dead-letter-retry-/).first().click();
  await expect(page.getByTestId("platform-webhook-success")).toContainText(
    "Retried webhook evt_s56_deadletter_case for tenant-example."
  );
  await expect(page.getByTestId("platform-webhook-retry-history-list")).toContainText("evt_s56_deadletter_case");
});
