import { expect, test, type Page } from "@playwright/test";

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

async function seedTenant(page: Page, input: { ownerEmail: string; tenantName: string }) {
  await login(page, input.ownerEmail);
  await page.goto("/settings/tenant");
  await page.getByTestId("tenant-name-input").fill(input.tenantName);
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");
  await logout(page);
}

test("S54: unauthenticated user is redirected from platform billing support to login", async ({ page }) => {
  await page.goto("/platform/billing-support");
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
});

test("S54: platform admin can log billing adjustments and support actions with tenant-visible audit trail", async ({
  page
}) => {
  const ownerEmail = "owner@platformbillingops.com";
  const tenantName = "Platform Billing Support Workspace";

  await seedTenant(page, { ownerEmail, tenantName });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform");
  await page.getByTestId("platform-home-link-billing-support").click();

  await expect(page).toHaveURL(/\/platform\/billing-support$/, { timeout: 15_000 });
  await page.getByTestId("platform-billing-support-search-input").fill(tenantName);
  const tenantCard = page.locator(".platform-tenant-card").filter({ hasText: tenantName }).first();
  await tenantCard.getByRole("button", { name: "Open detail" }).click();
  await expect(page.getByTestId("platform-billing-support-detail-name")).toContainText(tenantName);

  await page.getByTestId("platform-billing-adjustment-kind").selectOption("Service credit");
  await page.getByTestId("platform-billing-adjustment-amount").fill("125");
  await page.getByTestId("platform-billing-adjustment-ticket").fill("BILL-1042");
  await page.getByTestId("platform-billing-adjustment-reason").fill("Refund approved after duplicate invoice confusion.");
  await page.getByTestId("platform-billing-adjustment-submit").click();

  await expect(page.getByTestId("platform-billing-adjustment-success")).toContainText(
    "Logged Service credit for Platform Billing Support Workspace on ticket BILL-1042."
  );
  await expect(page.getByTestId("platform-billing-adjustment-history")).toContainText("BILL-1042");
  await expect(page.getByTestId("platform-billing-adjustment-history")).toContainText("Refund approved after duplicate invoice confusion.");

  await page.getByTestId("platform-support-action-kind").selectOption("Escalated");
  await page.getByTestId("platform-support-ticket").fill("SUP-2041");
  await page.getByTestId("platform-support-reason").fill("Customer requested platform review after finance handoff.");
  await page.getByTestId("platform-support-action-submit").click();

  await expect(page.getByTestId("platform-support-action-success")).toContainText(
    "Logged Escalated for Platform Billing Support Workspace on ticket SUP-2041."
  );
  await expect(page.getByTestId("platform-support-action-history")).toContainText("SUP-2041");
  await expect(page.getByTestId("platform-support-action-history")).toContainText(
    "Customer requested platform review after finance handoff."
  );

  await logout(page);

  await login(page, ownerEmail);
  await page.goto("/audit-logs");
  await expect(page.getByTestId("audit-log-list")).toContainText("Platform applied Service credit £125 on ticket BILL-1042.");
  await expect(page.getByTestId("audit-log-list")).toContainText("Platform marked support ticket SUP-2041 as Escalated.");

  await page.getByTestId("audit-log-search-input").fill("BILL-1042");
  await expect(page.getByTestId("audit-log-list")).toContainText("BILL-1042");
  await page.getByRole("button", { name: "View details" }).first().click();
  await expect(page.getByTestId("audit-log-details-action")).toContainText("platform.billing.adjusted");
  await expect(page.getByTestId("audit-log-details-metadata-ticketId")).toContainText("BILL-1042");
  await expect(page.getByTestId("audit-log-details-metadata-reason")).toContainText(
    "Refund approved after duplicate invoice confusion."
  );
});

test("S54: platform billing and support ops stay blocked until ticket and reason are provided", async ({ page }) => {
  const ownerEmail = "owner@platformbillingvalidation.com";
  const tenantName = "Platform Billing Validation Workspace";

  await seedTenant(page, { ownerEmail, tenantName });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform/billing-support");
  await page.getByTestId("platform-billing-support-search-input").fill(tenantName);
  const tenantCard = page.locator(".platform-tenant-card").filter({ hasText: tenantName }).first();
  await tenantCard.getByRole("button", { name: "Open detail" }).click();

  await page.getByTestId("platform-billing-adjustment-submit").click();
  await expect(page.getByTestId("platform-billing-adjustment-error")).toContainText(
    "Enter a support ticket ID before applying a billing adjustment."
  );

  await page.getByTestId("platform-support-action-submit").click();
  await expect(page.getByTestId("platform-support-action-error")).toContainText(
    "Enter a support ticket ID before saving a support action."
  );
});
