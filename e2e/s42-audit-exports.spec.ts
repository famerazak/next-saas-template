import { readFileSync } from "node:fs";
import { expect, test, type Download, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function createTenantAuditEvents(page: Page, email: string, tenantName: string, inviteEmail: string) {
  await login(page, email);

  await page.goto("/settings/tenant");
  await page.getByTestId("tenant-name-input").fill(tenantName);
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");

  await page.goto("/team");
  await page.getByTestId("team-invite-email-input").fill(inviteEmail);
  await page.getByTestId("team-invite-role-select").selectOption("Viewer");
  await page.getByTestId("team-invite-submit").click();
  await expect(page.getByTestId("team-invite-success")).toContainText("Invite sent.");
}

async function downloadVia(page: Page, testId: string): Promise<{ filename: string; content: string }> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId(testId).click()
  ]);

  return readDownload(download);
}

async function readDownload(download: Download): Promise<{ filename: string; content: string }> {
  const path = await download.path();
  if (!path) {
    throw new Error("Download path unavailable.");
  }

  return {
    filename: download.suggestedFilename(),
    content: readFileSync(path, "utf8")
  };
}

test("S42: admin can export tenant audit logs to CSV and JSON with tenant boundaries preserved", async ({ page, browser }) => {
  await createTenantAuditEvents(page, "admin@alphaexports.com", "Alpha Exports Workspace", "viewer@alphaexports.com");

  const otherContext = await browser.newPage();
  await createTenantAuditEvents(otherContext, "admin@betaexports.com", "Beta Exports Workspace", "viewer@betaexports.com");
  await otherContext.close();

  await page.goto("/audit-logs");
  await expect(page.getByTestId("audit-log-results-summary")).toContainText("Showing 2 of 2 events");

  const csv = await downloadVia(page, "audit-export-csv-button");
  expect(csv.filename).toContain("alpha-exports-workspace-audit-logs");
  expect(csv.content).toContain("tenant.settings.updated");
  expect(csv.content).toContain("team.invite.created");
  expect(csv.content).toContain("Alpha Exports Workspace");
  expect(csv.content).toContain("viewer@alphaexports.com");
  expect(csv.content).not.toContain("Beta Exports Workspace");
  expect(csv.content).not.toContain("viewer@betaexports.com");

  const json = await downloadVia(page, "audit-export-json-button");
  expect(json.filename).toContain("alpha-exports-workspace-audit-logs");
  expect(json.content).toContain('"eventCount": 2');
  expect(json.content).toContain('"tenantId": "tenant-alphaexports"');
  expect(json.content).toContain('"summary": "Updated tenant settings for Alpha Exports Workspace."');
  expect(json.content).not.toContain("Beta Exports Workspace");
  expect(json.content).not.toContain("viewer@betaexports.com");
});

