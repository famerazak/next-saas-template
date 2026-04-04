import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S31: unauthenticated user is redirected from payment method setup to login", async ({ page }) => {
  await page.goto("/billing/payment-method?setup=seti_fake");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S31: owner can add and then update card details from billing", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/billing");

  await expect(page.getByTestId("billing-payment-method-empty")).toBeVisible();
  await page.getByTestId("billing-payment-method-start-button").click();

  await expect(page).toHaveURL(/\/billing\/payment-method\?setup=seti_/);
  await expect(page.getByTestId("payment-method-setup-page")).toBeVisible();
  await expect(page.getByTestId("payment-method-setup-page")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByTestId("payment-method-setup-id")).toContainText("seti_");

  await page.getByTestId("payment-method-cardholder-input").fill("Taylor Owner");
  await page.getByTestId("payment-method-email-input").fill("billing@example.com");
  await page.getByTestId("payment-method-card-number-input").fill("4242424242424242");
  await page.getByTestId("payment-method-expiry-month-input").fill("12");
  await page.getByTestId("payment-method-expiry-year-input").fill(String(new Date().getFullYear() + 1));
  await page.getByTestId("payment-method-cvc-input").fill("123");
  await page.getByTestId("payment-method-save-button").click();

  await expect(page).toHaveURL(/\/billing(?:\?payment_method=updated)?$/);
  await expect(page.getByTestId("billing-payment-method-card")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByTestId("billing-payment-method-summary")).toBeVisible();
  await expect(page.getByTestId("billing-payment-method-brand")).toContainText("Visa ending in 4242");
  await expect(page.getByTestId("billing-payment-method-email")).toHaveText("billing@example.com");
  await expect(page.getByTestId("billing-payment-method-start-button")).toHaveText("Update card details");

  await page.getByTestId("billing-payment-method-start-button").click();
  await expect(page).toHaveURL(/\/billing\/payment-method\?setup=seti_/);
  await expect(page.getByTestId("payment-method-setup-page")).toHaveAttribute("data-hydrated", "true");

  await page.getByTestId("payment-method-cardholder-input").fill("Taylor Owner");
  await page.getByTestId("payment-method-email-input").fill("finance@example.com");
  await page.getByTestId("payment-method-card-number-input").fill("5555555555554444");
  await page.getByTestId("payment-method-expiry-month-input").fill("11");
  await page.getByTestId("payment-method-expiry-year-input").fill(String(new Date().getFullYear() + 2));
  await page.getByTestId("payment-method-cvc-input").fill("456");
  await page.getByTestId("payment-method-save-button").click();

  await expect(page).toHaveURL(/\/billing(?:\?payment_method=updated)?$/);
  await expect(page.getByTestId("billing-payment-method-brand")).toContainText("Mastercard ending in 4444");
  await expect(page.getByTestId("billing-payment-method-email")).toHaveText("finance@example.com");
});

test("S31: invalid card details show a clear inline error", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/billing");
  await page.getByTestId("billing-payment-method-start-button").click();

  await expect(page).toHaveURL(/\/billing\/payment-method\?setup=seti_/);
  await expect(page.getByTestId("payment-method-setup-page")).toHaveAttribute("data-hydrated", "true");
  await page.getByTestId("payment-method-card-number-input").fill("1234");
  await page.getByTestId("payment-method-save-button").click();

  await expect(page.getByTestId("payment-method-setup-error")).toContainText(
    "Complete the full card form before saving the payment method."
  );
});
