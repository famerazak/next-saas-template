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
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
}

async function seedTenantWithInvitedMember(
  page: Page,
  input: {
    ownerEmail: string;
    memberEmail: string;
    tenantName: string;
  }
) {
  await login(page, input.ownerEmail);

  await page.goto("/settings/tenant");
  await page.getByTestId("tenant-name-input").fill(input.tenantName);
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");

  await page.goto("/team");
  await page.getByTestId("team-invite-email-input").fill(input.memberEmail);
  await page.getByTestId("team-invite-role-select").selectOption("Member");
  await page.getByRole("button", { name: "Invite member" }).click();
  await expect(page.getByTestId("team-invite-success")).toContainText("Invite sent.");

  await logout(page);

  await login(page, input.memberEmail);
  await expect(page.getByTestId("pending-invites-list")).toContainText(input.tenantName);
  await page.getByRole("button", { name: "Accept invite" }).click();
  await expect(page.getByTestId("tenant-name")).toContainText(input.tenantName);
  await expect(page.getByTestId("tenant-role")).toContainText("Member");

  await logout(page);
}

test("S53: unauthenticated user is redirected from platform users to login", async ({ page }) => {
  await page.goto("/platform/users");
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
});

test("S53: platform admin can search global users and inspect memberships", async ({ page }) => {
  const ownerEmail = "owner@platformusers.com";
  const memberEmail = "member@platformusers.com";
  const tenantName = "Platform Users Workspace";

  await seedTenantWithInvitedMember(page, {
    ownerEmail,
    memberEmail,
    tenantName
  });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform");
  await page.getByTestId("platform-home-link-users").click();

  await expect(page).toHaveURL(/\/platform\/users$/, { timeout: 15_000 });
  await expect(page.getByTestId("platform-users-page")).toBeVisible();
  await expect(page.getByTestId("platform-user-list")).toContainText(memberEmail);

  await page.getByTestId("platform-user-search-input").fill(memberEmail);
  await expect(page.getByTestId("platform-user-results-summary")).toContainText("Showing 1 of");
  await expect(page.getByTestId("platform-user-list")).toContainText(memberEmail);
  await expect(page.getByTestId("platform-user-list")).not.toContainText(ownerEmail);

  const userCard = page.locator(".platform-user-card").filter({ hasText: memberEmail }).first();
  await expect(userCard).toBeVisible();
  await userCard.getByRole("button", { name: "Open user" }).click();

  await expect(page.getByTestId("platform-user-detail-email")).toContainText(memberEmail);
  await expect(page.getByTestId("platform-user-detail-memberships")).toContainText(tenantName);
  await expect(page.getByTestId("platform-user-detail-memberships")).toContainText("Member");
  await expect(page.getByTestId("platform-user-detail-memberships")).toContainText("Active");
});
