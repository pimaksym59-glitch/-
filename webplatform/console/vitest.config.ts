import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * Vitest (Stage 2 §12 / FE-ADR-10). jsdom + RTL + MSW; deterministic. Coverage
 * focuses on shared/lib (the engineering core). Playwright specs (tests/e2e,
 * *.spec.ts) are excluded — they run under Playwright, not Vitest.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    css: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/shared/lib/**', 'src/shared/config/**'],
      thresholds: { lines: 60, functions: 60, statements: 60, branches: 55 },
    },
  },
});
