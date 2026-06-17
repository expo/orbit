import { defineConfig } from 'vite';

// Native node addons (.node) and the modules that load them. Rollup can't
// bundle these — they must stay as require()s resolved by Node at runtime,
// against the linked apple-resign's own node_modules.
const NATIVE_EXTERNALS = [
  'keytar',
  'system-ca',
  'win-export-certificate-and-key',
  'macos-export-certificate-and-key',
];

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
      external: NATIVE_EXTERNALS,
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
