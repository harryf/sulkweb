import { defineConfig, type Plugin } from 'vite';
import { existsSync } from 'node:fs';
import path from 'path';

/**
 * Missing /assets/* files must 404, not fall through to the SPA index.html —
 * Phaser would otherwise try to DECODE the html (e.g. as audio) and spray
 * unhandled "Unable to decode audio data" rejections on clones that haven't
 * run `pnpm fetch-audio`. A real 404 takes the loader's tolerated loaderror
 * path and the AudioManager's cache guards keep the game silent (ISC-328).
 */
const assets404 = (): Plugin => ({
  name: 'assets-404',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = decodeURIComponent((req.url ?? '').split('?')[0]);
      if (url.startsWith('/assets/') && !existsSync(path.join(__dirname, 'public', url))) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [assets404()],
  build: {
    rollupOptions: {
      // Two-page app: the game (index) + the field manual.
      input: {
        main: path.resolve(__dirname, 'index.html'),
        manual: path.resolve(__dirname, 'manual.html'),
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '@sulk/engine',
        replacement: path.resolve(__dirname, '../engine/src'),
      },
    ],
  },
});
