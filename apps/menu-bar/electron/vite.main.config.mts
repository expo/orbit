import { defineConfig, normalizePath } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

// normalizePath(path.resolve(__dirname, './foo')); // C:/project/foo

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  optimizeDeps: {
    include: ['common-types'],
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
  ],
});
