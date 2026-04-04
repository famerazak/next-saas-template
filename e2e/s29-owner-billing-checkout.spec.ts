import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S29: unauthenticated user is redirected from billing to login", async ({ page }) => {
  await page.goto("/billing");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S29: admin cannot access owner-only billing controls", async ({ page }) => {
  await login(page, "admin@example.com");

  await expect(page.getByTestId("sidebar-link-billing")).toHaveCount(0);
  await page.goto("/billing");

  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByText("Your role does not allow access to the billing area.")).toBeVisible();
});

test("S29: owner can start billing checkout with plan and seat selection", async ({ page }) => {
  await login(page, "owner@example.com");

  await expect(page.getByTestId("sidebar-link-billing")).toBeVisible();
  await page.getByTestId("sidebar-link-billing").click();

  await expect(page).toHaveURL(/\/billing$/);
  await expect(page.getByTestId("billing-page")).toBeVisible();
  await expect(page.getByTestId("billing-page")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByTestId("billing-owner-pill")).toContainText("owner@example.com");

  await page.getByTestId("billing-plan-select").selectOption("growth");
  await expect(page.getByTestId("billing-plan-select")).toHaveValue("growth");
  await page.getByTestId("billing-seat-count-input").fill("12");
  await expect(page.getByTestId("billing-seat-count-input")).toHaveValue("12");
  await expect(page.getByTestId("billing-live-estimate")).toContainText("Growth");
  await expect(page.getByTestId("billing-live-estimate")).toContainText("12 seats");
  await page.getByTestId("billing-start-checkout-button").click();

  await expect(page.getByTestId("billing-checkout-success")).toContainText("Checkout session started.");
  await expect(page.getByTestId("billing-checkout-ready-card")).toBeVisible();
  await expect(page.getByTestId("billing-checkout-plan")).toHaveText("Growth");
  await expect(page.getByTestId("billing-checkout-seats")).toHaveText("12");
  await expect(page.getByTestId("billing-checkout-total")).toContainText("£415");
  await expect(page.getByTestId("billing-checkout-id")).toContainText("chk_");
  await expect(page.getByTestId("billing-checkout-url")).toContainText("/billing?checkout=ready");
});
