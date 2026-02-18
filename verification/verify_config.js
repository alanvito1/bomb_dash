
module.exports = {
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 480, height: 800 },
    actionTimeout: 10000,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
};
