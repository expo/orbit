import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

// normalizePath(path.resolve(__dirname, './foo')); // C:/project/foo

// https://vitejs.dev/config
export default defineConfig(({ command }) => ({
  resolve: {
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  optimizeDeps: {
    include: ['common-types'],
  },
  // Inline process.env.WDIO_E2E so the wdio-electron-service hook branch is
  // dead-coded out of production bundles (and the dep isn't pulled in).
  define: {
    'process.env.WDIO_E2E': JSON.stringify(process.env.WDIO_E2E ?? ''),
  },
  build: {
    commonjsOptions: {
      include: [/common-types/, /node_modules/],
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: '../modules/auto-updater/electron/**/*.(html|css|js)',
          dest: 'react-native-electron-modules',
        },
      ],
      structured: true,
    }),
    // Only copy the renderer's built output into the packaged main bundle;
    // in dev mode the renderer is served from the Vite dev server and
    // ./dist doesn't exist.
    ...(command === 'build'
      ? [
          viteStaticCopy({
            targets: [
              {
                src: './dist/**/*',
                dest: 'renderer/',
              },
            ],
            structured: true,
          }),
        ]
      : []),
  ],
}));
