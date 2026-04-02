import { expect, test } from "@playwright/test";

const authPages = [
  {
    path: "/login",
    heading: "Log in",
    buttonText: "Log in"
  },
  {
    path: "/signup",
    heading: "Create account",
    buttonText: "Create account"
  },
  {
    path: "/forgot-password",
    heading: "Reset password",
    buttonText: "Send reset email"
  }
];

for (const page of authPages) {
  test(`S01: renders ${page.path}`, async ({ page: browserPage }) => {
    await browserPage.goto(page.path);
    await expect(browserPage.getByTestId("nav-auth-state")).toHaveText("Signed out");
    await expect(browserPage.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(browserPage.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(browserPage.getByTestId("app-sidebar")).toHaveCount(0);
    await expect(browserPage.getByRole("heading", { name: page.heading })).toBeVisible();
    await expect(browserPage.getByTestId("auth-form")).toBeVisible();
    await expect(browserPage.getByRole("button", { name: page.buttonText })).toBeVisible();
  });
}
