import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S12: unauthenticated user is redirected from team page to login", async ({ page }) => {
  await page.goto("/team");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S12: admin can submit invite and see pending invite in UI", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/team");

  await expect(page.getByTestId("team-page")).toBeVisible();
  await expect(page.getByTestId("team-invite-form")).toBeVisible();

  await page.getByTestId("team-invite-email-input").fill("new-member@example.com");
  await page.getByTestId("team-invite-role-select").selectOption("Member");
  await page.getByRole("button", { name: "Invite member" }).click();

  await expect(page.getByTestId("team-invite-success")).toHaveText("Invite sent.");
  await expect(page.getByTestId("team-pending-invites")).toContainText("new-member@example.com");
  await expect(page.getByTestId("team-pending-invites")).toContainText("Pending");
});

test("S12: member cannot use team management flow and sees no-access UX", async ({ page }) => {
  await login(page, "member@example.com");
  await page.goto("/team");

  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No access" })).toBeVisible();
  await expect(page.getByTestId("team-invite-form")).toHaveCount(0);
});
