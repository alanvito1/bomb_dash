// playwright.config.js
module.exports = {
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    headless: true,
    viewport: { width: 480, height: 800 },
    actionTimeout: 10000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'smoke',
      testMatch: '**/smoke/**',
      timeout: 15000,
    },
    {
      name: 'integration',
      testMatch: '**/integration/**',
    },
  ],
};
