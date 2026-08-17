import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@sulk/engine': resolve(__dirname, '../engine/src'),
      '@sulk/engine/index.js': resolve(__dirname, '../engine/src/index.ts')
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    deps: {
      inline: ['@sulk/engine', '@sulk/engine/index.js']
    },
    coverage: {
      // Client shipping code only — the engine has its own coverage run.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts', 'src/tests/**'],
    },
  },
});
