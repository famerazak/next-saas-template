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

test("S61: unauthenticated user is redirected from files to login", async ({ page }) => {
  await page.goto("/files");
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
});

test("S61: tenant file uploads stay scoped to the current tenant", async ({ page }) => {
  await login(page, "owner@alphafiles.com");
  await expect(page.getByTestId("sidebar-link-files")).toBeVisible();
  await page.goto("/files");
  await expect(page.getByTestId("tenant-files-page")).toBeVisible();
  await page.getByTestId("tenant-files-input").setInputFiles({
    name: "alpha-brief.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("alpha tenant brief")
  });
  await page.getByTestId("tenant-files-upload-submit").click();
  await expect(page.getByTestId("tenant-files-success")).toContainText("alpha-brief.txt uploaded successfully.");
  await expect(page.getByTestId("tenant-files-list")).toContainText("alpha-brief.txt");
  await logout(page);

  await login(page, "owner@betafiles.com");
  await expect(page.getByTestId("sidebar-link-files")).toBeVisible();
  await page.goto("/files");
  await expect(page.getByTestId("tenant-files-page")).toBeVisible();
  await expect(page.getByTestId("tenant-files-list")).not.toContainText("alpha-brief.txt");
  await expect(page.getByTestId("tenant-files-empty-state")).toBeVisible();
});

test("S61: viewer can see tenant files but cannot upload new ones", async ({ page }) => {
  await login(page, "owner@viewerfiles.com");
  await expect(page.getByTestId("sidebar-link-files")).toBeVisible();
  await page.goto("/files");
  await expect(page.getByTestId("tenant-files-page")).toBeVisible();
  await page.getByTestId("tenant-files-input").setInputFiles({
    name: "viewer-readme.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("viewer tenant file")
  });
  await page.getByTestId("tenant-files-upload-submit").click();
  await expect(page.getByTestId("tenant-files-success")).toContainText("viewer-readme.txt uploaded successfully.");
  await logout(page);

  await login(page, "viewer@viewerfiles.com");
  await expect(page.getByTestId("sidebar-link-files")).toBeVisible();
  await page.goto("/files");
  await expect(page.getByTestId("tenant-files-page")).toBeVisible();
  await expect(page.getByTestId("tenant-files-list")).toContainText("viewer-readme.txt");
  await expect(page.getByTestId("tenant-files-readonly-note")).toBeVisible();
  await expect(page.getByTestId("tenant-files-upload-form")).toHaveCount(0);
});
