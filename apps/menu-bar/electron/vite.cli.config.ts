import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    outDir: './.vite/build/cli',
    commonjsOptions: {
      include: [/common-types/, /eas-shared/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ['common-types', 'eas-shared'],
  },
});
