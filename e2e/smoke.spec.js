// @ts-check
const { test, expect } = require('@playwright/test');

test('Infrastructure Smoke Test', async ({ page }) => {
  // This test validates the core success criterion of the technical dossier.
  // It proves that the new orchestration strategy can successfully launch
  // both frontend and backend servers and allow Playwright to connect.

  // 1. Navigate to the application's root page.
  // A successful navigation without timeout is the primary validation.
  await page.goto('/');

  // 2. Assert the page title to confirm the correct page was loaded.
  // This is a basic check to ensure the frontend is rendering as expected.
  await expect(page).toHaveTitle(/Bomb Dash/);

  console.log(
    'Infrastructure Smoke Test: PASSED. Servers are up and accessible.'
  );
});
