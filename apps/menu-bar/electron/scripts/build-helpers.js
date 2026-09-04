#!/usr/bin/env node
'use strict';

// Build (or reuse) the native helper binaries (anisette + zsign) for the HOST
// platform and place them in electron/bin/, so the dev app and `yarn make`
// bundle a self-contained app that can authenticate with Apple and re-sign IPAs
// with no extra setup.
//
// Written in Node (no bash dependency) so it runs from the prestart / premake /
// prepackage hooks on every platform — including Windows, where `yarn` runs
// scripts through cmd.exe and `bash` isn't on PATH.
//
//   yarn build:helpers           # build/copy whatever is missing
//   FORCE=1 yarn build:helpers   # rebuild even if already present
//
// Idempotent (a helper already in electron/bin/ is left untouched) and
// best-effort: a missing toolchain prints a warning and the script still exits
// 0, so `yarn start` is never blocked.
//
// Host build prerequisites:
//   Linux:   `git`, `g++`, `make`, `pkg-config`, `libssl-dev` for zsign.
//   macOS:   Xcode toolchain (anisette uses the Swift helper); `git` + clang for zsign.
//   Windows: zsign is reused from a prebuilt binary if present (zsign build/windows/vs2022).
// Anisette on Windows/Linux needs NO toolchain — it runs the anisette-js WASM
// emulator, whose assets ship in the ipa-resign package and are copied into
// electron/anisette/ below.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const electronDir = path.resolve(__dirname, '..');
const binDir = path.join(electronDir, 'bin');
const cacheDir = path.join(electronDir, '.cache'); // already gitignored
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(cacheDir, { recursive: true });

const FORCE = !!process.env.FORCE;
const platform = process.platform; // 'win32' | 'darwin' | 'linux'
const archLabel = process.arch === 'arm64' ? 'arm64' : 'x64';

const log = (m) => console.log(`> ${m}`);
const warn = (m) => console.warn(`! ${m}`);

// Already present (and not forced)?
const have = (artifact) => !FORCE && fs.existsSync(path.join(binDir, artifact));

// Run a command, inheriting stdio. On Windows use a shell so PATHEXT resolves
// cargo/git/yarn (.cmd/.exe); on POSIX skip the shell so path args with spaces
// don't need quoting. Returns true on exit code 0.
function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  return res.status === 0;
}

function copy(src, dest) {
  fs.copyFileSync(src, dest);
  try {
    fs.chmodSync(dest, 0o755);
  } catch {
    /* chmod is a no-op / unsupported on Windows */
  }
  log(`-> ${dest}`);
}

// Resolve the `ipa-resign` npm package (prebuilt macOS helpers ship in its
// bin/). Resolve its main entry (respects the package `exports` map) then walk
// up to the package root; fall back to a sibling `apple-resign` checkout for
// local development (needed for Linux/Windows builds — the npm package ships
// only the macOS binaries, other platforms build from source).
function resolveIpaResign() {
  const paths = [path.join(electronDir, '..', '..', 'cli'), electronDir];
  try {
    let dir = path.dirname(require.resolve('ipa-resign', { paths }));
    while (dir !== path.dirname(dir)) {
      const pkg = path.join(dir, 'package.json');
      if (fs.existsSync(pkg)) {
        try {
          if (JSON.parse(fs.readFileSync(pkg, 'utf8')).name === 'ipa-resign') return dir;
        } catch {
          /* ignore unparseable package.json and keep walking up */
        }
      }
      dir = path.dirname(dir);
    }
  } catch {
    /* fall through to the sibling-layout fallback */
  }
  const fallback = path.resolve(electronDir, '..', '..', '..', '..', 'apple-resign');
  return fs.existsSync(fallback) ? fallback : null;
}

const appleResign = resolveIpaResign();
if (!appleResign) {
  warn(
    "Could not resolve the 'ipa-resign' package — run 'yarn install' first. Skipping helper build."
  );
  process.exit(0);
}

// A prebuilt binary in the package's bin/ (the npm tarball ships the macOS
// pair) always beats building from source.
function copyPrebuiltIfPresent(artifact) {
  const prebuilt = path.join(appleResign, 'bin', artifact);
  if (fs.existsSync(prebuilt)) {
    log(`Copying prebuilt ${artifact} from ${appleResign}/bin`);
    copy(prebuilt, path.join(binDir, artifact));
    return true;
  }
  return false;
}

function buildAnisette() {
  // Windows/Linux (and macOS with ORBIT_ANISETTE_FORCE_WASM) run the anisette-js
  // WASM emulator — copy its assets from the ipa-resign package into
  // electron/anisette/ so they ship (extraResource) and the bundled CLI can load
  // them via ORBIT_ANISETTE_ASSETS_DIR (see src/main.ts).
  copyAnisetteWasmAssets();

  if (platform === 'darwin') {
    // macOS default provider: the native Swift helper.
    const artifact = 'anisette';
    if (have(artifact)) return log(`${artifact} already present — skipping (FORCE=1 to rebuild)`);
    if (copyPrebuiltIfPresent(artifact)) return;
    if (run('yarn', ['build:helper:macos'], { cwd: appleResign })) {
      copy(path.join(appleResign, 'bin', artifact), path.join(binDir, artifact));
    } else {
      warn(
        'Could not build the macOS anisette helper — check the Xcode toolchain. Apple ID auth will be unavailable.'
      );
    }
    return;
  }
  // Windows / Linux: no native anisette binary — the WASM assets copied above are
  // the provider.
}

// Copy the anisette-js WASM assets (assets/anisette/) from the resolved
// ipa-resign package into electron/anisette/. Shipped via extraResource so the
// packaged app has them; the CLI reads them through ORBIT_ANISETTE_ASSETS_DIR.
function copyAnisetteWasmAssets() {
  const src = path.join(appleResign, 'assets', 'anisette');
  const dest = path.join(electronDir, 'anisette');
  if (!fs.existsSync(src)) {
    warn(
      `anisette WASM assets not found at ${src} — run 'yarn build:anisette' in apple-resign (or reinstall). Apple ID auth on Windows/Linux will be unavailable.`
    );
    return;
  }
  if (!FORCE && fs.existsSync(path.join(dest, 'anisette_rs.wasm'))) {
    return log('anisette WASM assets already present — skipping (FORCE=1 to refresh)');
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  log(`-> ${dest} (anisette WASM assets)`);
}

function buildZsign() {
  if (platform === 'win32') {
    const artifact = `zsign-win-${archLabel}.exe`;
    if (have(artifact)) return log(`${artifact} already present — skipping (FORCE=1 to rebuild)`);
    const prebuilt = path.join(appleResign, 'bin', artifact);
    if (fs.existsSync(prebuilt)) {
      log(`Copying prebuilt ${artifact} from apple-resign/bin`);
      copy(prebuilt, path.join(binDir, artifact));
    } else {
      warn(
        `No ${artifact} found. Build zsign with VS2022 (zsign build/windows/vs2022) or download a release`
      );
      warn(
        'from https://github.com/zhlynn/zsign/releases, drop it in apple-resign/bin/, then re-run.'
      );
      warn('Re-signing will be unavailable until then (Apple ID auth still works).');
    }
    return;
  }
  // linux / darwin: prebuilt if the package ships one, else clone + make.
  const artifact = platform === 'darwin' ? 'zsign' : `zsign-linux-${archLabel}`;
  if (have(artifact)) return log(`${artifact} already present — skipping (FORCE=1 to rebuild)`);
  if (copyPrebuiltIfPresent(artifact)) return;
  const zsrc = path.join(cacheDir, 'zsign');
  if (fs.existsSync(path.join(zsrc, '.git'))) {
    log('Updating zsign source');
    run('git', ['-C', zsrc, 'pull', '--ff-only']);
  } else {
    log('Cloning zsign source');
    if (!run('git', ['clone', '--depth', '1', 'https://github.com/zhlynn/zsign.git', zsrc])) {
      warn(
        'Could not clone zsign — re-signing will be unavailable until a zsign binary is on PATH.'
      );
      return;
    }
  }
  const makeDir = path.join(zsrc, 'build', platform === 'darwin' ? 'macos' : 'linux');
  if (run('make', [], { cwd: makeDir })) {
    copy(path.join(zsrc, 'bin', 'zsign'), path.join(binDir, artifact));
  } else {
    warn(
      `Could not build zsign (${platform}) — re-signing will be unavailable until a zsign binary is on PATH.`
    );
  }
}

buildAnisette();
buildZsign();

log('Done — helpers in electron/bin:');
for (const file of fs.readdirSync(binDir)) {
  log(`  ${file} (${fs.statSync(path.join(binDir, file)).size} bytes)`);
}
