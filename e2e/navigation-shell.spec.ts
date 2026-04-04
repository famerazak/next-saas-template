import { expect, test } from "@playwright/test";

test.describe("App shell navigation", () => {
  test("signed-out pages keep the public header without a sidebar", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByTestId("nav-auth-state")).toHaveText("Signed out");
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(page.getByTestId("app-sidebar")).toHaveCount(0);
  });

  test("desktop admin sees sidebar links and active state", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("supersecret");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.getByTestId("sidebar-link-team")).toBeVisible();
    await page.getByTestId("sidebar-link-team").click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByTestId("sidebar-link-team")).toHaveAttribute("aria-current", "page");
    await expect(page.locator("header").getByRole("link", { name: "Billing" })).toHaveCount(0);
  });
});

test.describe("App shell mobile drawer", () => {
  test.use({ viewport: { width: 430, height: 932 } });

  test("mobile admin can open the sidebar drawer", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("supersecret");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByTestId("app-shell-menu-toggle")).toBeEnabled();
    await expect(page.getByTestId("app-sidebar")).toHaveAttribute("data-state", "closed");
    await page.getByTestId("app-shell-menu-toggle").click();
    await expect(page.getByTestId("app-sidebar")).toHaveAttribute("data-state", "open");
    await page.getByTestId("sidebar-link-billing").click();
    await expect(page).toHaveURL(/\/billing$/);
    await expect(page.getByTestId("app-sidebar")).toHaveAttribute("data-state", "closed");
  });
});
