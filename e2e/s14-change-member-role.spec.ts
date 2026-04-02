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

test("S14: owner can change a member role from member to viewer", async ({ page }) => {
  await login(page, "owner@nebulahq.com");
  await page.goto("/team");

  await page.getByTestId("team-invite-email-input").fill("member@sidequest.dev");
  await page.getByTestId("team-invite-role-select").selectOption("Member");
  await page.getByRole("button", { name: "Invite member" }).click();
  await expect(page.getByTestId("team-pending-invites")).toContainText("member@sidequest.dev");

  await logout(page);

  await login(page, "member@sidequest.dev");
  await page.getByRole("button", { name: "Accept invite" }).click();
  await expect(page.getByTestId("tenant-name")).toContainText("Nebulahq Workspace");
  await expect(page.getByTestId("tenant-role")).toContainText("Member");

  await logout(page);

  await login(page, "owner@nebulahq.com");
  await page.goto("/team");

  const memberId = "e2e-member@sidequest.dev";
  await expect(page.getByTestId("team-member-list")).toContainText("member@sidequest.dev");
  await page.getByTestId(`team-role-select-${memberId}`).selectOption("Viewer");
  await page.getByTestId(`team-role-save-${memberId}`).click();

  await expect(page.getByTestId("team-role-success")).toContainText("Role updated for member@sidequest.dev.");
  await expect(page.getByTestId("team-member-list")).toContainText("Viewer");
});
