import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

function teamMemberRow(page: Page, memberId: string) {
  return page.getByTestId(`team-member-row-${memberId}`);
}

async function inviteAndAccept(page: Page, actorEmail: string, guestEmail: string) {
  await login(page, actorEmail);
  await page.goto("/team");

  await page.getByTestId("team-invite-email-input").fill(guestEmail);
  await page.getByTestId("team-invite-role-select").selectOption("Member");
  await page.getByRole("button", { name: "Invite member" }).click();

  await expect(page.getByTestId("team-invite-success")).toHaveText("Invite sent.");
  await expect(page.getByTestId("team-pending-invites")).toContainText(guestEmail);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, guestEmail);
  await expect(page.getByTestId("pending-invites-card")).toBeVisible();
  await page.getByRole("button", { name: "Accept invite" }).click();
  await expect(page.getByTestId("pending-invites-card")).toHaveCount(0);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test("S14: unauthenticated user is redirected from team page to login", async ({ page }) => {
  await page.goto("/team");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S14: admin can change another member's role", async ({ page }) => {
  const guestEmail = `s14-role-change-${crypto.randomUUID().slice(0, 8)}@example.com`;

  await inviteAndAccept(page, "admin@example.com", guestEmail);

  await login(page, "admin@example.com");
  await page.goto("/team");

  const targetRow = page.getByTestId(/^team-member-row-/).filter({ hasText: guestEmail }).first();

  await expect(targetRow).toBeVisible();
  await expect(targetRow).toContainText(guestEmail);
  await expect(targetRow).toContainText("Member");

  const memberId = await targetRow.getAttribute("data-testid");
  if (!memberId) {
    throw new Error("Missing team member row test id.");
  }

  await page.getByTestId(memberId.replace("team-member-row-", "team-member-role-select-")).selectOption("Viewer");
  await page.getByTestId(memberId.replace("team-member-row-", "team-member-role-save-")).click();

  await expect(targetRow).toContainText("Viewer");
});

test("S14: owner can change another member's role", async ({ page }) => {
  const guestEmail = `s14-owner-role-${crypto.randomUUID().slice(0, 8)}@example.com`;

  await inviteAndAccept(page, "owner@example.com", guestEmail);

  await login(page, "owner@example.com");
  await page.goto("/team");

  const targetRow = page.getByTestId(/^team-member-row-/).filter({ hasText: guestEmail }).first();

  await expect(targetRow).toBeVisible();
  const memberId = await targetRow.getAttribute("data-testid");
  if (!memberId) {
    throw new Error("Missing team member row test id.");
  }

  await page.getByTestId(memberId.replace("team-member-row-", "team-member-role-select-")).selectOption("Admin");
  await page.getByTestId(memberId.replace("team-member-row-", "team-member-role-save-")).click();

  await expect(targetRow).toContainText("Admin");
});

test("S14: member cannot use team management controls", async ({ page }) => {
  await login(page, "member@example.com");
  await page.goto("/team");

  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No access" })).toBeVisible();
  await expect(page.getByTestId("team-invite-form")).toHaveCount(0);
  await expect(page.getByTestId("team-members-card")).toHaveCount(0);
});
