import { expect, test, type Page } from "@playwright/test";

async function signup(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 15_000 });
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
}

async function login(page: Page, email: string, password = "supersecret") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
}

test("S72: starter-ready smoke flow covers signup, tenant admin, billing, audit logs, and platform access", async ({
  page
}) => {
  const stamp = String(Date.now());
  const password = "supersecret";
  const ownerEmail = `owner-${stamp}@starter-${stamp}.test`;
  const inviteEmail = `invitee-${stamp}@starter-${stamp}.test`;
  const tenantName = `Starter Smoke ${stamp}`;

  await signup(page, ownerEmail, password);

  await expect(page.getByTestId("dashboard-email")).toContainText(ownerEmail);
  await expect(page.getByTestId("tenant-role")).toContainText("Owner");
  await expect(page.getByTestId("tenant-name")).toContainText("Workspace");

  await page.getByTestId("sidebar-link-tenant-settings").click();
  await expect(page).toHaveURL(/\/settings\/tenant$/);
  await expect(page.getByTestId("tenant-settings-page")).toBeVisible();
  await page.getByTestId("tenant-name-input").fill(tenantName);
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");

  await page.getByTestId("sidebar-link-dashboard").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("tenant-name")).toContainText(tenantName);

  await page.getByTestId("sidebar-link-team").click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByTestId("team-page")).toBeVisible();
  await page.getByTestId("team-invite-email-input").fill(inviteEmail);
  await page.getByTestId("team-invite-role-select").selectOption("Member");
  await page.getByTestId("team-invite-submit").click();
  await expect(page.getByTestId("team-invite-success")).toContainText("Invite sent.");
  await expect(page.getByTestId("team-pending-invites")).toContainText(inviteEmail);

  await page.getByTestId("sidebar-link-billing").click();
  await expect(page).toHaveURL(/\/billing$/);
  await expect(page.getByTestId("billing-page")).toBeVisible();
  await page.getByTestId("billing-plan-select").selectOption("growth");
  await page.getByTestId("billing-seat-count-input").fill("3");
  await page.getByTestId("billing-start-checkout-button").click();
  await expect(page.getByTestId("billing-checkout-success")).toContainText("Checkout session started.");

  await page.getByTestId("billing-payment-method-start-button").click();
  await expect(page).toHaveURL(/\/billing\/payment-method\?setup=seti_/);
  await expect(page.getByTestId("payment-method-setup-page")).toBeVisible();
  await page.getByTestId("payment-method-cardholder-input").fill("Starter Owner");
  await page.getByTestId("payment-method-email-input").fill(ownerEmail);
  await page.getByTestId("payment-method-card-number-input").fill("4242424242424242");
  await page.getByTestId("payment-method-expiry-month-input").fill("12");
  await page.getByTestId("payment-method-expiry-year-input").fill(String(new Date().getFullYear() + 2));
  await page.getByTestId("payment-method-cvc-input").fill("123");
  await page.getByTestId("payment-method-save-button").click();

  await expect(page).toHaveURL(/\/billing(?:\?payment_method=updated)?$/);
  await expect(page.getByTestId("billing-page")).toBeVisible();

  await page.getByTestId("sidebar-link-audit-logs").click();
  await expect(page).toHaveURL(/\/audit-logs$/);
  await expect(page.getByTestId("audit-log-console")).toBeVisible();
  await expect(page.getByTestId("audit-log-list")).toContainText(`Updated tenant settings for ${tenantName}.`);
  await expect(page.getByTestId("audit-log-list")).toContainText(`Invited ${inviteEmail} as Member.`);
  await expect(page.getByTestId("audit-log-list")).toContainText("Started Growth checkout for 3 seats.");

  await logout(page);
  await login(page, "platform-admin@example.com");

  await expect(page.getByTestId("sidebar-link-platform")).toBeVisible();
  await page.getByTestId("sidebar-link-platform").click();
  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByTestId("platform-home-page")).toBeVisible();
  await expect(page.getByTestId("platform-kpi-grid")).toBeVisible();
  await expect(page.getByTestId("platform-home-card-webhooks")).toContainText("Webhook jobs");
  await expect(page.getByTestId("platform-home-link-diagnostics")).toBeVisible();
});
