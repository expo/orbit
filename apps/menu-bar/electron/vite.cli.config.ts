import { defineConfig } from 'vite';

// Native node addons (.node) and the modules that load them. Rollup can't
// bundle these — they must stay as require()s resolved by Node at runtime,
// against the linked ipa-resign's own node_modules.
const NATIVE_EXTERNALS = [
  'keytar',
  'system-ca',
  'win-export-certificate-and-key',
  'macos-export-certificate-and-key',
];

// ipa-resign ships a heavily obfuscated bundle whose entry uses dynamic
// require() calls (e.g. `require("buffer")`) that Rollup can't resolve.
const EXTERNALS = [...NATIVE_EXTERNALS, 'ipa-resign', /^ipa-resign\//];

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
      external: EXTERNALS,
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
