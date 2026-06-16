import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  // Inline process.env.WDIO_E2E so the wdio-electron-service hook branch is
  // dead-coded out of production bundles (and the dep isn't pulled in).
  define: {
    'process.env.WDIO_E2E': JSON.stringify(process.env.WDIO_E2E ?? ''),
  },
});
