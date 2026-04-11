import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

function createFile(index: number) {
  return {
    name: `rate-limit-${index}.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`rate limit payload ${index}`, "utf-8")
  };
}

test("S70: auth rate limits still show a usable cooldown message", async ({ page }) => {
  await page.goto("/login");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel("Email").fill("s70-auth@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
  }

  await expect(page.getByTestId("login-error")).toContainText("Too many attempts. Try again in");
});

test("S70: team invite limit shows a usable cooldown message", async ({ page }) => {
  await login(page, "owner-s70-invites@example.com");
  await page.goto("/team");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByTestId("team-invite-email-input").fill(`invite-limit-${attempt}@example.com`);
    await page.getByTestId("team-invite-role-select").selectOption("Member");
    await page.getByTestId("team-invite-submit").click();
    await expect(page.getByTestId("team-invite-success")).toContainText("Invite sent.");
  }

  await page.getByTestId("team-invite-email-input").fill("invite-limit-blocked@example.com");
  await page.getByTestId("team-invite-submit").click();

  await expect(page.getByTestId("team-invite-error")).toContainText("Too many attempts. Try again in");
});

test("S70: file upload limit shows a usable cooldown message", async ({ page }) => {
  await login(page, "owner-s70-files@example.com");
  await page.goto("/files");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.getByTestId("tenant-files-input").setInputFiles(createFile(attempt));
    await page.getByTestId("tenant-files-upload-submit").click();
    await expect(page.getByTestId("tenant-files-success")).toContainText("uploaded successfully.");
  }

  await page.getByTestId("tenant-files-input").setInputFiles(createFile(99));
  await page.getByTestId("tenant-files-upload-submit").click();

  await expect(page.getByTestId("tenant-files-error")).toContainText("Too many attempts. Try again in");
});
