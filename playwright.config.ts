import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3200', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 800 } } },
  ],
  webServer: {
    command: 'pnpm start --port 3200',
    url: 'http://localhost:3200',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
