// Bundles the CLI (build/index.js) into one CommonJS file for hermesc.
// Usage: node hermes-launcher/bundle.mjs <outfile>
import { build } from 'esbuild';

await build({
  entryPoints: ['build/index.js'],
  outfile: process.argv[2],
  bundle: true,
  minify: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  // A native addon; ipa-resign also requires it indirectly at runtime.
  external: ['macos-export-certificate-and-key'],
  logLevel: 'warning',
});
