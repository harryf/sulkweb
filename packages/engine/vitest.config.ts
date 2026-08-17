import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      // Shipping code only: keeps one-off mission-conversion scripts/ and
      // config files out of the report.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts'],
    },
  },
});
