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
  await expect(page).toHaveURL(/\/login$/);
}

test("S13: invited user can accept invite and appears in team member list", async ({ page }) => {
  await login(page, "boss@acme.com");
  await page.goto("/team");

  await page.getByTestId("team-invite-email-input").fill("guest@outside.com");
  await page.getByTestId("team-invite-role-select").selectOption("Member");
  await page.getByRole("button", { name: "Invite member" }).click();

  await expect(page.getByTestId("team-invite-success")).toHaveText("Invite sent.");
  await expect(page.getByTestId("team-pending-invites")).toContainText("guest@outside.com");

  await logout(page);

  await login(page, "guest@outside.com");
  await expect(page.getByTestId("tenant-name")).toContainText("Outside Workspace");
  await expect(page.getByTestId("tenant-role")).toContainText("Owner");
  await expect(page.getByTestId("pending-invites-card")).toBeVisible();
  await expect(page.getByTestId("pending-invites-list")).toContainText("Acme Workspace");

  await page.getByRole("button", { name: "Accept invite" }).click();

  await expect(page.getByTestId("tenant-name")).toContainText("Acme Workspace");
  await expect(page.getByTestId("tenant-role")).toContainText("Member");
  await expect(page.getByTestId("pending-invites-card")).toHaveCount(0);

  await logout(page);

  await login(page, "boss@acme.com");
  await page.goto("/team");
  await expect(page.getByTestId("team-member-count")).toHaveText("2");
  await expect(page.getByTestId("team-member-list")).toContainText("guest@outside.com");
  await expect(page.getByTestId("team-member-list")).toContainText("Member");
});
