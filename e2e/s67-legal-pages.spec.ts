import { expect, test } from "@playwright/test";

const legalPages = [
  {
    path: "/privacy",
    title: "Privacy Policy",
    body: "Optional analytics remain consent-gated"
  },
  {
    path: "/terms",
    title: "Terms of Service",
    body: "counsel-reviewed contract language"
  },
  {
    path: "/dpa",
    title: "Data Processing Addendum",
    body: "public placeholder"
  },
  {
    path: "/baa",
    title: "Business Associate Agreement",
    body: "visible placeholder"
  }
];

test("S67: public layout exposes discoverable legal links", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("public-legal-footer")).toBeVisible();
  await expect(page.getByTestId("legal-link-privacy")).toBeVisible();
  await expect(page.getByTestId("legal-link-terms")).toBeVisible();
  await expect(page.getByTestId("legal-link-dpa")).toBeVisible();
  await expect(page.getByTestId("legal-link-baa")).toBeVisible();
});

for (const legalPage of legalPages) {
  test(`S67: renders ${legalPage.path}`, async ({ page }) => {
    await page.goto(legalPage.path);
    const legalPageCard = page.getByTestId("legal-page");

    await expect(legalPageCard).toBeVisible();
    await expect(page.getByRole("heading", { name: legalPage.title })).toBeVisible();
    await expect(page.getByText(legalPage.body)).toBeVisible();
    await expect(legalPageCard.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(legalPageCard.getByRole("link", { name: "Terms" })).toBeVisible();
  });
}
