import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S38: tenant admin actions appear in audit logs", async ({ page }) => {
  const adminEmail = "qa-admin@audittrail.com";
  const inviteEmail = "new.viewer@audittrail.com";

  await login(page, adminEmail);

  await page.goto("/settings/tenant");
  await page.getByTestId("tenant-name-input").fill("Audit Trail Workspace");
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");

  await page.goto("/team");
  await page.getByTestId("team-invite-email-input").fill(inviteEmail);
  await page.getByTestId("team-invite-role-select").selectOption("Viewer");
  await page.getByTestId("team-invite-submit").click();
  await expect(page.getByTestId("team-invite-success")).toContainText("Invite sent.");

  await page.goto("/audit-logs");
  await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();
  await expect(page.getByTestId("audit-log-console")).toBeVisible();
  await expect(page.getByTestId("audit-log-list")).toBeVisible();
  await expect(page.getByTestId("audit-log-results-summary")).toContainText("Showing 2 of 2 events");
  await expect(page.getByTestId("audit-log-list")).toContainText("Updated tenant settings for Audit Trail Workspace.");
  await expect(page.getByTestId("audit-log-list")).toContainText(`Invited ${inviteEmail} as Viewer.`);
  await expect(page.getByTestId("audit-log-list")).toContainText(adminEmail);
});

test("S38: owner billing actions appear in audit logs", async ({ page }) => {
  const ownerEmail = "owner@billingtrail.com";

  await login(page, ownerEmail);

  await page.goto("/billing");
  await page.getByTestId("billing-plan-select").selectOption("growth");
  await page.getByTestId("billing-seat-count-input").fill("8");
  await page.getByTestId("billing-start-checkout-button").click();
  await expect(page.getByTestId("billing-checkout-success")).toContainText("Checkout session started.");

  await page.getByTestId("billing-payment-method-start-button").click();
  await expect(page).toHaveURL(/\/billing\/payment-method\?setup=/);
  await page.getByTestId("payment-method-card-number-input").fill("4242424242424242");
  await page.getByTestId("payment-method-save-button").click();
  await expect(page).toHaveURL(/\/billing$/, { timeout: 15_000 });
  await expect(page.getByTestId("billing-page")).toBeVisible();

  await page.goto("/audit-logs");
  await expect(page.getByTestId("audit-log-list")).toBeVisible();
  await expect(page.getByTestId("audit-log-list")).toContainText("Started Growth checkout for 8 seats.");
  await expect(page.getByTestId("audit-log-list")).toContainText(ownerEmail);
});
