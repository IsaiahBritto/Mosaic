import { test, expect } from "@playwright/test";

test.describe("Mosaic smoke tests", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /log in|sign in|login/i })).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /sign up|create account/i })).toBeVisible();
  });

  test("legacy day route redirects to week", async ({ page }) => {
    await page.goto("/day");
    await expect(page).toHaveURL(/\/(week|login)/);
  });

  test("unauthenticated user redirected from week view", async ({ page }) => {
    await page.goto("/week");
    await expect(page).toHaveURL(/\/login/);
  });
});
