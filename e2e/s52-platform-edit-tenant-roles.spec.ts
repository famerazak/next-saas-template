import { expect, test, type Locator, type Page } from "@playwright/test";

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

function memberRowByEmail(page: Page, email: string): Locator {
  return page.locator(".platform-member-row").filter({ hasText: email }).first();
}

async function openTenantDetail(page: Page, tenantName: string) {
  const tenantCard = page.locator(".platform-tenant-card").filter({ hasText: tenantName }).first();
  await expect(tenantCard).toBeVisible();
  await tenantCard.getByRole("button", { name: "Open detail" }).click();
  await expect(page.getByTestId("platform-tenant-detail-name")).toContainText(tenantName);
}

test("S52: platform admin can change a tenant member role with a required reason", async ({ page }) => {
  const ownerEmail = "owner@platformroleops.com";
  const memberEmail = "member@platformroleops.com";
  const tenantName = "Platform Role Ops Workspace";
  const reason = "Escalated support request confirmed this user needs admin access.";

  await seedTenantWithInvitedMember(page, {
    ownerEmail,
    memberEmail,
    tenantName
  });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform");
  await openTenantDetail(page, tenantName);

  const memberRow = memberRowByEmail(page, memberEmail);
  await expect(memberRow).toBeVisible();
  await memberRow.getByRole("combobox", { name: `Platform role for ${memberEmail}` }).selectOption("Admin");
  await page.getByTestId("platform-member-role-reason-input").fill(reason);
  await expect(memberRow.getByRole("button", { name: "Save role" })).toBeEnabled();
  await memberRow.getByRole("button", { name: "Save role" }).click();

  await expect(page.getByTestId("platform-member-role-success")).toContainText(`${memberEmail} changed from Member to Admin.`);
  await expect(memberRow).toContainText("Admin");
  await expect(page.getByTestId("platform-tenant-detail-members-summary")).toContainText("Admin roles: 2");

  await logout(page);

  await login(page, ownerEmail);
  await page.goto("/audit-logs");
  await expect(page.getByTestId("audit-log-list")).toContainText(`Platform changed ${memberEmail} to Admin.`);
  await expect(page.getByTestId("audit-log-list")).toContainText("platform.member.role_changed");
  await expect(page.getByTestId("audit-log-list")).toContainText(`Reason: ${reason}`);
});

test("S52: platform member role change is blocked until an operator reason is provided", async ({ page }) => {
  const ownerEmail = "owner@platformreasonrequired.com";
  const memberEmail = "member@platformreasonrequired.com";
  const tenantName = "Platform Reason Required Workspace";

  await seedTenantWithInvitedMember(page, {
    ownerEmail,
    memberEmail,
    tenantName
  });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform");
  await openTenantDetail(page, tenantName);

  const memberRow = memberRowByEmail(page, memberEmail);
  await expect(memberRow).toBeVisible();
  await memberRow.getByRole("combobox", { name: `Platform role for ${memberEmail}` }).selectOption("Viewer");
  await expect(memberRow.getByRole("button", { name: "Save role" })).toBeEnabled();
  await memberRow.getByRole("button", { name: "Save role" }).click();

  await expect(page.getByTestId("platform-member-role-error")).toContainText(
    "Enter an operator reason between 8 and 240 characters."
  );
  await expect(memberRow).toContainText("Member");
  await expect(page.getByTestId("platform-tenant-detail-members-summary")).toContainText("Admin roles: 1");
});
