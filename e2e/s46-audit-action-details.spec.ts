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

test("S46: tenant admin can open a tenant audit event and inspect its metadata", async ({ page }) => {
  const adminEmail = "admin@detailstenant.com";
  const inviteEmail = "viewer@detailstenant.com";

  await login(page, adminEmail);

  await page.goto("/team");
  await page.getByTestId("team-invite-email-input").fill(inviteEmail);
  await page.getByTestId("team-invite-role-select").selectOption("Viewer");
  await page.getByTestId("team-invite-submit").click();
  await expect(page.getByTestId("team-invite-success")).toContainText("Invite sent.");

  await page.goto("/audit-logs");
  await page.getByTestId(/^audit-log-view-details-/).first().click();

  await expect(page.getByTestId("audit-log-details-panel")).toBeVisible();
  await expect(page.getByTestId("audit-log-details-summary")).toContainText(`Invited ${inviteEmail} as Viewer.`);
  await expect(page.getByTestId("audit-log-details-action")).toContainText("team.invite.created");
  await expect(page.getByTestId("audit-log-details-target-type")).toContainText("invite");
  await expect(page.getByTestId("audit-log-details-target-label")).toContainText(inviteEmail);
  await expect(page.getByTestId("audit-log-details-metadata-invitedEmail")).toContainText(inviteEmail);
  await expect(page.getByTestId("audit-log-details-metadata-invitedRole")).toContainText("Viewer");
});

test("S46: platform-origin audit event details include operator reason metadata", async ({ page }) => {
  const payload = JSON.stringify({
    id: "evt_platform_details_case",
    type: "invoice.paid",
    createdAt: new Date().toISOString(),
    data: {
      object: {
        tenantId: "tenant-example",
        invoiceId: "in_platform_details_case",
        amount: 633,
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
  const retryReason = "Operator verified the Stripe incident was cleared before replay.";
  await page.getByTestId(/^platform-dead-letter-reason-input-/).first().fill(retryReason);
  await page.getByTestId(/^platform-dead-letter-retry-/).first().click();
  await expect(page.getByTestId("platform-webhook-success")).toContainText("evt_platform_details_case");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

  await login(page, "admin@example.com");
  await page.goto("/audit-logs");
  await page.getByTestId(/^audit-log-view-details-/).first().click();

  await expect(page.getByTestId("audit-log-details-panel")).toBeVisible();
  await expect(page.getByTestId("audit-log-details-summary")).toContainText(
    "Platform retried webhook evt_platform_details_case."
  );
  await expect(page.getByTestId("audit-log-details-action")).toContainText("platform.webhook.retry");
  await expect(page.getByTestId("audit-log-details-target-type")).toContainText("webhook_delivery");
  await expect(page.getByTestId("audit-log-details-target-label")).toContainText("invoice.paid");
  await expect(page.getByTestId("audit-log-details-metadata-reason")).toContainText(retryReason);
  await expect(page.getByTestId("audit-log-details-metadata-failureReason")).toContainText(
    "Forced webhook handler failure for retry testing."
  );
});
