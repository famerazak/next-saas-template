import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S11: unauthenticated user is redirected from team page to login", async ({ page }) => {
  await page.goto("/team");
  await expect(page).toHaveURL(/\/login$/);
});

test("S11: admin can view tenant member list", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/team");

  await expect(page.getByTestId("team-page")).toBeVisible();
  await expect(page.getByTestId("team-tenant-name")).toHaveText("Example Workspace");
  const teamMemberCountText = (await page.getByTestId("team-member-count").textContent()) ?? "";
  const teamMemberCount = Number.parseInt(teamMemberCountText, 10);
  expect(teamMemberCount).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId("team-member-list")).toContainText("admin@example.com");
  await expect(page.getByTestId("team-member-list")).toContainText("Admin");
});

test("S11: member cannot view tenant member list", async ({ page }) => {
  await login(page, "member@example.com");
  await page.goto("/team");
  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No access" })).toBeVisible();
});
