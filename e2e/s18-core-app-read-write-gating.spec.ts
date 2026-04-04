import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function openDashboard(page: Page, email: string) {
  await login(page, email);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
}

function dashboardNoteEditor(page: Page) {
  return page.getByTestId("dashboard-shared-note-form");
}

function dashboardNoteInput(page: Page) {
  return page.getByTestId("dashboard-shared-note-input");
}

function dashboardNoteSave(page: Page) {
  return page.getByTestId("dashboard-shared-note-save");
}

function dashboardNoteReadOnly(page: Page) {
  return page.getByTestId("dashboard-shared-note-readonly");
}

test("S18: unauthenticated user is redirected from dashboard to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S18: owner can edit the shared dashboard note", async ({ page }) => {
  await openDashboard(page, "owner@example.com");

  await expect(dashboardNoteEditor(page)).toBeVisible();
  await expect(dashboardNoteInput(page)).toBeEditable();
  await expect(dashboardNoteSave(page)).toBeEnabled();

  const note = `Owner note ${crypto.randomUUID().slice(0, 8)}`;
  await dashboardNoteInput(page).fill(note);
  await dashboardNoteSave(page).click();

  await expect(page.getByTestId("dashboard-note-success")).toHaveText("Dashboard note updated.");
  await expect(dashboardNoteInput(page)).toHaveValue(note);

  await page.reload();
  await expect(dashboardNoteInput(page)).toHaveValue(note);
});

test("S18: admin can edit the shared dashboard note", async ({ page }) => {
  await openDashboard(page, "admin@example.com");

  await expect(dashboardNoteEditor(page)).toBeVisible();
  await expect(dashboardNoteInput(page)).toBeEditable();
  await expect(dashboardNoteSave(page)).toBeEnabled();

  const note = `Admin note ${crypto.randomUUID().slice(0, 8)}`;
  await dashboardNoteInput(page).fill(note);
  await dashboardNoteSave(page).click();

  await expect(page.getByTestId("dashboard-note-success")).toHaveText("Dashboard note updated.");
  await expect(dashboardNoteInput(page)).toHaveValue(note);
});

for (const email of ["member@example.com", "viewer@example.com"]) {
  test(`S18: ${email.split("@")[0]} sees read-only dashboard note UX`, async ({ page }) => {
    await openDashboard(page, email);

    await expect(dashboardNoteReadOnly(page)).toBeVisible();
    await expect(dashboardNoteInput(page)).toBeDisabled();
    await expect(dashboardNoteSave(page)).toBeDisabled();
    await expect(dashboardNoteReadOnly(page)).toHaveText("Read only for your role.");
  });
}
