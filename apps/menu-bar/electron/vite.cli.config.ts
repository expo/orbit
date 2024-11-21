import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    outDir: './.vite/build/cli',
    commonjsOptions: {
      include: [/common-types/, /eas-shared/, /node_modules/],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    include: ['common-types', 'eas-shared'],
  },
});
