import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
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

test("S15: unauthenticated user is redirected from team page to login", async ({ page }) => {
  await page.goto("/team");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S15: admin can remove another member and the team list updates immediately", async ({
  page
}) => {
  const guestEmail = `s15-remove-${crypto.randomUUID().slice(0, 8)}@example.com`;

  await inviteAndAccept(page, "admin@example.com", guestEmail);

  await login(page, "admin@example.com");
  await page.goto("/team");

  const targetRow = page.locator('[data-testid^="team-member-row-"]').filter({ hasText: guestEmail }).first();

  await expect(targetRow).toBeVisible();
  await expect(targetRow).toContainText(guestEmail);

  const memberId = await targetRow.getAttribute("data-testid");
  if (!memberId) {
    throw new Error("Missing team member row test id.");
  }

  await targetRow.getByRole("button", { name: /remove/i }).click();

  await expect(page.getByTestId("team-member-list")).not.toContainText(guestEmail);
  await expect(page.getByTestId(memberId)).toHaveCount(0);
});

test("S15: owner can remove another member and the team list updates immediately", async ({
  page
}) => {
  const guestEmail = `s15-owner-remove-${crypto.randomUUID().slice(0, 8)}@example.com`;

  await inviteAndAccept(page, "owner@example.com", guestEmail);

  await login(page, "owner@example.com");
  await page.goto("/team");

  const beforeCountText = (await page.getByTestId("team-member-count").textContent()) ?? "";
  const beforeCount = Number.parseInt(beforeCountText, 10);

  const targetRow = page.locator('[data-testid^="team-member-row-"]').filter({ hasText: guestEmail }).first();

  await expect(targetRow).toBeVisible();
  await targetRow.getByRole("button", { name: /remove/i }).click();

  await expect(page.getByTestId("team-member-list")).not.toContainText(guestEmail);
  await expect(page.getByTestId("team-member-count")).toContainText(String(beforeCount - 1));
});

for (const email of ["member@example.com", "viewer@example.com"]) {
  test(`S15: ${email.split("@")[0]} cannot use team management controls`, async ({ page }) => {
    await login(page, email);
    await page.goto("/team");

    await expect(page.getByTestId("no-access-card")).toBeVisible();
    await expect(page.getByRole("heading", { name: "No access" })).toBeVisible();
    await expect(page.getByTestId("team-invite-form")).toHaveCount(0);
    await expect(page.getByTestId("team-members-card")).toHaveCount(0);
  });
}
