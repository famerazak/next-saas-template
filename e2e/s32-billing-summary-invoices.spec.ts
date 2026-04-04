import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S32: tenant user sees billing summary on the dashboard", async ({ page }) => {
  await login(page, "member@example.com");

  await expect(page.getByTestId("dashboard-billing-summary-card")).toBeVisible();
  await expect(page.getByTestId("dashboard-billing-plan")).toHaveText(/\S.+/);
  await expect(page.getByTestId("dashboard-billing-seats")).toHaveText(/\d+/);
  await expect(page.getByTestId("dashboard-billing-total")).toHaveText(/£\d+/);
  await expect(page.getByTestId("dashboard-billing-summary-access")).toContainText("Visible to all tenant roles");
  await expect(page.getByTestId("dashboard-billing-latest-invoice")).toContainText("Current billing cycle");
  await expect(page.getByTestId("dashboard-billing-link")).toHaveText("View billing overview");
});

test("S32: owner sees recent invoices in billing", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/billing");

  await expect(page.getByTestId("billing-invoices-card")).toBeVisible();
  await expect(page.getByTestId("billing-invoices-list")).toBeVisible();
  await expect(page.getByTestId("billing-invoices-list").locator("article")).toHaveCount(3);
  await expect(page.getByTestId("billing-invoices-list")).toContainText("Current billing cycle");
  await expect(page.getByTestId("billing-invoices-list")).toContainText("Previous billing cycle");
  await expect(page.getByTestId("billing-invoices-list")).toContainText("Starter setup");
  await expect(page.getByTestId("billing-invoices-list")).toContainText("Open");
  await expect(page.getByTestId("billing-invoices-list")).toContainText("Paid");
  await expect(page.getByTestId("billing-invoices-list")).toContainText("Draft");
  const invoiceAmounts = await page.locator("[data-testid^='billing-invoice-amount-']").allTextContents();
  expect(invoiceAmounts).toHaveLength(3);
  for (const invoiceAmount of invoiceAmounts) {
    expect(invoiceAmount).toMatch(/£\d+/);
  }
});
