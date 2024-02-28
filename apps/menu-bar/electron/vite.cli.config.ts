import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    browserField: false,
  },
  build: {
    outDir: './.vite/build/cli',
    commonjsOptions: {
      include: [/common-types/, /eas-shared/, /node_modules/],
    },
    rollupOptions: {
      external: ['uuid'],
    },
  },
  optimizeDeps: {
    include: ['common-types', 'eas-shared'],
  },
});
