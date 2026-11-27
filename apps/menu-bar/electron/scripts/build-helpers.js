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
//   macOS: Xcode toolchain (anisette uses the Swift helper); `git` + clang for zsign.
// Windows and Linux need NO toolchain: anisette runs the anisette-js WASM emulator
// and re-signing uses the in-process WASM zsign signer (chosen in
// apps/cli/src/commands/ResignIpa.ts). ipa-resign loads both from its own
// package in node_modules, so nothing is built or copied on Windows/Linux.

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
  // Windows and Linux run the anisette-js WASM emulator, which ipa-resign loads
  // from its own package — no native anisette binary to build, bundle, or ship.
  // Only macOS uses the native Swift helper.
  if (platform !== 'darwin') {
    return log('anisette: Windows/Linux use the WASM emulator — skipping native anisette build.');
  }
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
}

function buildZsign() {
  // Windows and Linux re-sign with ipa-resign's in-process WASM signer (chosen in
  // apps/cli/src/commands/ResignIpa.ts), which ships inside the ipa-resign
  // package — no native zsign binary to build, bundle, or ship. Only macOS uses
  // the native zsign binary.
  if (platform !== 'darwin') {
    return log('zsign: Windows/Linux use the WASM signer — skipping native zsign build.');
  }
  // macOS: prebuilt if the package ships one, else clone + make.
  const artifact = 'zsign';
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
  const makeDir = path.join(zsrc, 'build', 'macos');
  if (run('make', [], { cwd: makeDir })) {
    copy(path.join(zsrc, 'bin', 'zsign'), path.join(binDir, artifact));
  } else {
    warn(
      'Could not build zsign (macOS) — re-signing will be unavailable until a zsign binary is on PATH.'
    );
  }
}

buildAnisette();
buildZsign();

log('Done — helpers in electron/bin:');
for (const file of fs.readdirSync(binDir)) {
  log(`  ${file} (${fs.statSync(path.join(binDir, file)).size} bytes)`);
}
