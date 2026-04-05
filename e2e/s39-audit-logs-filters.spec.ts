import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S39: admin can search and filter tenant audit logs", async ({ page }) => {
  const adminEmail = "admin@auditfilters.com";
  const inviteEmail = "viewer@auditfilters.com";

  await login(page, adminEmail);

  await page.goto("/settings/tenant");
  await page.getByTestId("tenant-name-input").fill("Filter Workspace");
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");

  await page.goto("/team");
  await page.getByTestId("team-invite-email-input").fill(inviteEmail);
  await page.getByTestId("team-invite-role-select").selectOption("Viewer");
  await page.getByTestId("team-invite-submit").click();
  await expect(page.getByTestId("team-invite-success")).toContainText("Invite sent.");

  await page.goto("/audit-logs");
  await expect(page.getByTestId("audit-log-console")).toBeVisible();
  await expect(page.getByTestId("audit-log-results-summary")).toContainText("Showing 2 of 2 events");
  await expect(page.getByTestId("audit-export-csv-button")).toBeVisible();
  await expect(page.getByTestId("audit-export-json-button")).toBeVisible();

  await page.getByTestId("audit-log-search-input").fill(inviteEmail);
  await expect(page.getByTestId("audit-log-results-summary")).toContainText("Showing 1 of 2 events");
  await expect(page.getByTestId("audit-log-list")).toContainText(`Invited ${inviteEmail} as Viewer.`);
  await expect(page.getByTestId("audit-log-list")).not.toContainText("Updated tenant settings for Filter Workspace.");

  await page.getByTestId("audit-log-search-input").fill("");
  await page.getByTestId("audit-log-action-filter").selectOption("tenant.settings.updated");
  await expect(page.getByTestId("audit-log-results-summary")).toContainText("Showing 1 of 2 events");
  await expect(page.getByTestId("audit-log-list")).toContainText("Updated tenant settings for Filter Workspace.");
  await expect(page.getByTestId("audit-log-list")).not.toContainText(`Invited ${inviteEmail} as Viewer.`);

  await page.getByTestId("audit-log-action-filter").selectOption("all");
  await page.getByTestId("audit-log-origin-filter").selectOption("platform");
  await expect(page.getByTestId("audit-log-results-summary")).toContainText("Showing 0 of 2 events");
  await expect(page.getByTestId("audit-log-empty")).toContainText("No audit events recorded yet.");

  await page.getByTestId("audit-log-origin-filter").selectOption("tenant");
  await expect(page.getByTestId("audit-log-results-summary")).toContainText("Showing 2 of 2 events");
});

test("S39: member cannot access audit logs", async ({ page }) => {
  await login(page, "member@example.com");
  await page.goto("/audit-logs");

  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByText("Your role does not allow access to the audit logs area.")).toBeVisible();
  await expect(page.getByTestId("audit-export-csv-button")).toHaveCount(0);
  await expect(page.getByTestId("audit-export-json-button")).toHaveCount(0);
});
