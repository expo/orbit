// Bundles the CLI (build/index.js) into one CommonJS file for hermesc.
// Usage: node hermes-launcher/bundle.mjs <outfile>
import { build } from 'esbuild';
import fs from 'fs';

// ipa-resign needs two accommodations to load on Hermes:
//
// - Hermes stores bytecode, not source, so Function.prototype.toString()
//   returns "function () { [bytecode] }". ipa-resign is obfuscated with a
//   self-defending check that regex-tests its own functions' source and spins
//   forever when it doesn't match. Hermes's 'show source' directive keeps the
//   source of the functions under it, so it's applied to that one module only.
// - At load time it builds a dynamic-import helper with
//   `new Function('u', 'return import(u)')`, which Hermes can't compile from a
//   string. A module-local Function turns exactly that shape into a
//   require()-based import; everything else goes to the real constructor.
const IPA_RESIGN = /[\\/]node_modules[\\/]ipa-resign[\\/]dist[\\/]index\.js$/;

const IPA_RESIGN_PRELUDE = `'show source';
var Function = (function (NativeFunction) {
  var DYNAMIC_IMPORT = /^\\s*return\\s+import\\(\\s*[A-Za-z_$][\\w$]*\\s*\\)\\s*;?\\s*$/;
  function HermesFunction() {
    var body = arguments[arguments.length - 1];
    if (arguments.length === 2 && typeof body === 'string' && DYNAMIC_IMPORT.test(body)) {
      return function (specifier) {
        return new Promise(function (resolve) {
          resolve(require(specifier));
        });
      };
    }
    return NativeFunction.apply(this, arguments);
  }
  HermesFunction.prototype = NativeFunction.prototype;
  return HermesFunction;
})(globalThis.Function);
`;

const ipaResignOnHermes = {
  name: 'ipa-resign-on-hermes',
  setup(b) {
    b.onLoad({ filter: IPA_RESIGN }, async (args) => {
      const contents = await fs.promises.readFile(args.path, 'utf8');
      return { contents: IPA_RESIGN_PRELUDE + contents, loader: 'js' };
    });
  },
};

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
  plugins: [ipaResignOnHermes],
});

const out = fs.readFileSync(process.argv[2], 'utf8');
if (!out.includes('"show source"') && !out.includes("'show source'")) {
  throw new Error("the 'show source' directive for ipa-resign was dropped from the bundle");
}
