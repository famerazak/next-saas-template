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

async function uploadFile(page: Page, email: string, fileName: string, content: string) {
  await login(page, email);
  await page.goto("/files");
  await expect(page.getByTestId("tenant-files-page")).toBeVisible();
  await page.getByTestId("tenant-files-input").setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer: Buffer.from(content)
  });
  await page.getByTestId("tenant-files-upload-submit").click();
  await expect(page.getByTestId("tenant-files-success")).toContainText(`${fileName} uploaded successfully.`);
}

test("S64: authorized tenant user can delete a file and it disappears from the UI", async ({ page }) => {
  await uploadFile(page, "owner@deleteflow.com", "delete-me.txt", "delete file flow");
  await logout(page);

  await login(page, "member@deleteflow.com");
  await page.goto("/files");
  await expect(page.getByTestId("tenant-files-list")).toContainText("delete-me.txt");

  await page.getByTestId(/^tenant-file-delete-/).first().click();

  await expect(page.getByTestId("tenant-files-success")).toContainText("delete-me.txt deleted successfully.");
  await expect(page.getByTestId("tenant-files-list")).not.toContainText("delete-me.txt");
  await expect(page.getByTestId("tenant-files-empty-state")).toBeVisible();
});

test("S64: viewer can see files but does not get delete controls", async ({ page }) => {
  await uploadFile(page, "owner@deleteviewer.com", "keep-me.txt", "viewer should not delete this");
  await logout(page);

  await login(page, "viewer@deleteviewer.com");
  await page.goto("/files");
  await expect(page.getByTestId("tenant-files-list")).toContainText("keep-me.txt");
  await expect(page.getByTestId("tenant-files-readonly-note")).toBeVisible();
  await expect(page.getByTestId(/^tenant-file-delete-/)).toHaveCount(0);
});
