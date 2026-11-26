import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Runs once before all test files: stops the run unless the database
    // is payflow-test.
    globalSetup: ['test/global-setup.ts'],
    // Runs in every test file: connects to payflow-test.
    setupFiles: ['test/setup.ts'],
    // Atlas is a remote database, so allow more time than the 5 s default.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
