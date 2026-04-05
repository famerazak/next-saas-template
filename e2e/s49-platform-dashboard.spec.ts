import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function seedTenant(page: Page, input: { email: string; tenantName: string; plan?: "starter" | "growth"; seatCount?: number }) {
  await login(page, input.email);

  await page.goto("/settings/tenant");
  await page.getByTestId("tenant-name-input").fill(input.tenantName);
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");

  await page.goto("/team");
  await expect(page.getByTestId("team-page")).toBeVisible();

  if (input.plan) {
    await page.goto("/billing");
    await page.getByTestId("billing-plan-select").selectOption(input.plan);
    await page.getByTestId("billing-seat-count-input").fill(String(input.seatCount ?? 3));
    await page.getByTestId("billing-start-checkout-button").click();
    await expect(page.getByTestId("billing-checkout-success")).toContainText("Checkout session started.");
  }

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
}

test("S49: platform dashboard shows tenant KPIs and supports search and filter", async ({ page }) => {
  await seedTenant(page, {
    email: "owner@alphaplatform.com",
    tenantName: "Alpha Platform Workspace",
    plan: "growth",
    seatCount: 8
  });
  await seedTenant(page, {
    email: "owner@betaplatform.com",
    tenantName: "Beta Platform Workspace"
  });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform");

  await expect(page.getByTestId("platform-dashboard-page")).toBeVisible();
  await expect(page.getByTestId("platform-kpi-tenants")).toBeVisible();
  await expect(page.getByTestId("platform-kpi-active-billing")).toBeVisible();
  await expect(page.getByTestId("platform-tenant-list")).toContainText("Alpha Platform Workspace");
  await expect(page.getByTestId("platform-tenant-list")).toContainText("Beta Platform Workspace");

  await page.getByTestId("platform-tenant-search-input").fill("beta platform workspace");
  await expect(page.getByTestId("platform-tenant-results-summary")).toContainText("Showing 1 of");
  await expect(page.getByTestId("platform-tenant-list")).toContainText("Beta Platform Workspace");
  await expect(page.getByTestId("platform-tenant-list")).not.toContainText("Alpha Platform Workspace");

  await page.getByTestId("platform-tenant-search-input").fill("");
  await page.getByTestId("platform-tenant-status-filter").selectOption("active-billing");
  await expect(page.getByTestId("platform-tenant-list")).toContainText("Alpha Platform Workspace");
  await expect(page.getByTestId("platform-tenant-list")).not.toContainText("Beta Platform Workspace");
});

test("S49: platform admin can open tenant detail with members and billing snapshot", async ({ page }) => {
  await seedTenant(page, {
    email: "owner@detailplatform.com",
    tenantName: "Detail Platform Workspace",
    plan: "growth",
    seatCount: 5
  });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform");

  await page.getByTestId("platform-tenant-search-input").fill("detail platform");
  await page.getByTestId(/^platform-tenant-open-/).first().click();

  await expect(page.getByTestId("platform-tenant-detail")).toBeVisible();
  await expect(page.getByTestId("platform-tenant-detail-name")).toContainText("Detail Platform Workspace");
  await expect(page.getByTestId("platform-tenant-detail-members")).toContainText("owner@detailplatform.com");
  await expect(page.getByTestId("platform-tenant-detail-plan")).toContainText("Growth");
  await expect(page.getByTestId("platform-tenant-detail-invoice-status")).toContainText("Pending");
  await expect(page.getByTestId("platform-tenant-detail-processed-webhooks")).toContainText("0");
  await expect(page.getByTestId("platform-detail-open-webhooks")).toBeVisible();
});
