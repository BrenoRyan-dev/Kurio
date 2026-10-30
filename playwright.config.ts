import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e', fullyParallel: true, retries: 1, reporter: [['html', { open: 'never' }], ['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', serviceWorkers: 'allow', timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 180_000 },
})
