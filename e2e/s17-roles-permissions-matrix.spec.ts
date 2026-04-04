import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S17: unauthenticated user is redirected from roles and permissions to login", async ({
  page
}) => {
  await page.goto("/roles-permissions");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S17: admin can open the roles and permissions matrix from the sidebar", async ({
  page
}) => {
  await login(page, "admin@example.com");

  await expect(page.getByTestId("sidebar-link-roles-permissions")).toBeVisible();
  await page.getByTestId("sidebar-link-roles-permissions").click();

  await expect(page).toHaveURL(/\/roles-permissions$/);
  await expect(page.getByTestId("roles-permissions-page")).toBeVisible();
  await expect(page.getByTestId("roles-permissions-summary")).toContainText("Owner");
  await expect(page.getByTestId("roles-permissions-summary")).toContainText("Viewer");
  await expect(page.getByTestId("roles-permissions-matrix")).toContainText("Team management");
  await expect(page.getByTestId("roles-permissions-matrix")).toContainText("Ownership transfer remains owner-only.");
  await expect(page.getByTestId("permission-row-roles-permissions-reference")).toContainText("Read only");
});

test("S17: member cannot access the roles and permissions page or sidebar link", async ({
  page
}) => {
  await login(page, "member@example.com");

  await expect(page.getByTestId("sidebar-link-roles-permissions")).toHaveCount(0);
  await page.goto("/roles-permissions");

  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByText("Ask a tenant admin if you need this permission.")).toBeVisible();
});
