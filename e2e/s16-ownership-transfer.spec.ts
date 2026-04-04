import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function inviteAndAccept(page: Page, actorEmail: string, guestEmail: string) {
  await login(page, actorEmail);
  await page.goto("/team");

  await page.getByTestId("team-invite-email-input").fill(guestEmail);
  await page.getByTestId("team-invite-role-select").selectOption("Member");
  await page.getByRole("button", { name: "Invite member" }).click();

  await expect(page.getByTestId("team-invite-success")).toHaveText("Invite sent.");
  await expect(page.getByTestId("team-pending-invites")).toContainText(guestEmail);

  await logout(page);

  await login(page, guestEmail);
  await expect(page.getByTestId("pending-invites-card")).toBeVisible();
  await page.getByRole("button", { name: "Accept invite" }).click();
  await expect(page.getByTestId("pending-invites-card")).toHaveCount(0);

  await logout(page);
}

function teamMemberRow(page: Page, email: string) {
  return page.locator('[data-testid^="team-member-row-"]').filter({ hasText: email }).first();
}

function ownershipTransferAction(row: Locator) {
  return row.getByRole("button", { name: /transfer ownership|make owner/i });
}

test("S16: unauthenticated user is redirected from team page to login", async ({ page }) => {
  await page.goto("/team");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S16: owner can transfer ownership to an eligible member and the UI updates", async ({
  page
}) => {
  const transfereeEmail = `s16-owner-transfer-${crypto.randomUUID().slice(0, 8)}@example.com`;

  await inviteAndAccept(page, "owner@example.com", transfereeEmail);

  await login(page, "owner@example.com");
  await page.goto("/team");

  const ownerRow = teamMemberRow(page, "owner@example.com");
  const transfereeRow = teamMemberRow(page, transfereeEmail);

  await expect(ownerRow).toBeVisible();
  await expect(transfereeRow).toBeVisible();
  await expect(ownerRow).toContainText("Owner");
  await expect(transfereeRow).toContainText("Member");

  const transferAction = ownershipTransferAction(transfereeRow);
  await expect(transferAction).toBeVisible();
  await transferAction.click();

  await expect(transfereeRow).toContainText("Owner");
  await expect(ownerRow).toContainText("Admin");

  await logout(page);

  await login(page, transfereeEmail);
  await page.goto("/team");

  const nowOwnerRow = teamMemberRow(page, transfereeEmail);
  const nowAdminRow = teamMemberRow(page, "owner@example.com");

  await expect(nowOwnerRow).toContainText("Owner");
  await expect(nowAdminRow).toContainText("Admin");

  const restoreAction = ownershipTransferAction(nowAdminRow);
  await expect(restoreAction).toBeVisible();
  await restoreAction.click();

  await expect(nowOwnerRow).toContainText("Admin");
  await expect(nowAdminRow).toContainText("Owner");
});

test("S16: admin cannot use ownership transfer controls", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/team");

  await expect(page.getByTestId("team-members-card")).toBeVisible();
  await expect(page.getByRole("button", { name: /transfer ownership|make owner/i })).toHaveCount(0);

  const adminRow = teamMemberRow(page, "admin@example.com");
  await expect(adminRow).toBeVisible();
  await expect(adminRow).toContainText("Admin");
  await expect(ownershipTransferAction(adminRow)).toHaveCount(0);
});
