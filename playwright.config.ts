import { defineConfig } from '@playwright/test';

const outputDir = process.env.PLAYWRIGHT_TEST_OUTPUT_DIR || 'test-results';
const htmlReportDir = process.env.PLAYWRIGHT_HTML_REPORT_DIR || 'playwright-report';
const jsonReportFile = process.env.PLAYWRIGHT_JSON_REPORT_FILE || `${outputDir}/results.json`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 1,
  workers: 1,
  outputDir,
  reporter: [
    ['list'],
    ['html', { outputFolder: htmlReportDir, open: 'never' }],
    ['json', { outputFile: jsonReportFile }]
  ],
  use: {
    viewport: { width: 1280, height: 720 },
    video: 'on',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
});
