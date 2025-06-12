import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@sulk/engine',
        replacement: path.resolve(__dirname, '../engine/src'),
      },
    ],
  },
});
