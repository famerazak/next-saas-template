import { readFileSync } from "node:fs";
import { expect, test, type Download, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
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

test("S63: signed download link downloads the selected tenant file", async ({ page }) => {
  await uploadFile(page, "owner@signeddownload.com", "tenant-brief.txt", "signed download tenant brief");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId(/^tenant-file-download-/).first().click()
  ]);

  const result = await readDownload(download);
  expect(result.filename).toBe("tenant-brief.txt");
  expect(result.content).toBe("signed download tenant brief");
});

test("S63: tampered signed download token is rejected", async ({ page }) => {
  await uploadFile(page, "owner@tampereddownload.com", "tampered-brief.txt", "download token rejection");

  const href = await page.getByTestId(/^tenant-file-download-/).first().getAttribute("href");
  expect(href).toBeTruthy();

  const url = new URL(href ?? "", "http://127.0.0.1:3001");
  const token = url.searchParams.get("token") ?? "";
  const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

  await page.goto(`/api/files/download?token=${encodeURIComponent(tamperedToken)}`);
  await expect(page.locator("body")).toContainText("Invalid or expired download link.");
});
