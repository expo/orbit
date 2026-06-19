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
//   Linux:   rustup + cargo-zigbuild (`pip install ziglang`); `git`, `g++`,
//            `make`, `pkg-config`, `libssl-dev` for zsign.
//   macOS:   Xcode toolchain (anisette uses the Swift helper); `git` + clang for zsign.
//   Windows: rustup with the native MSVC toolchain (anisette builds via cargo).
//            zsign is reused from a prebuilt binary if present (see
//            anisette/orbit-anisette-rs/README.md and zsign build/windows/vs2022).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

function commandExists(cmd) {
  const res = spawnSync(cmd, ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
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

// Resolve the linked `apple-resign` package (the anisette helper lives there).
// Resolve its main entry (respects the package `exports` map) then walk up to
// the package root; fall back to the sibling layout the `link:` target points at.
function resolveAppleResign() {
  const paths = [path.join(electronDir, '..', '..', 'cli'), electronDir];
  try {
    let dir = path.dirname(require.resolve('apple-resign', { paths }));
    while (dir !== path.dirname(dir)) {
      const pkg = path.join(dir, 'package.json');
      if (fs.existsSync(pkg)) {
        try {
          if (JSON.parse(fs.readFileSync(pkg, 'utf8')).name === 'apple-resign') return dir;
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

const appleResign = resolveAppleResign();
if (!appleResign) {
  warn("Could not resolve the 'apple-resign' package — run 'yarn install' first. Skipping helper build.");
  process.exit(0);
}

function buildAnisette() {
  if (platform === 'linux') {
    const artifact = `anisette-linux-${archLabel}`;
    if (have(artifact)) return log(`${artifact} already present — skipping (FORCE=1 to rebuild)`);
    if (run('yarn', ['build:helper:rust', `linux-${archLabel}`], { cwd: appleResign })) {
      copy(path.join(appleResign, 'bin', artifact), path.join(binDir, artifact));
    } else {
      warn(`Could not build ${artifact} — install rustup + cargo-zigbuild. Apple ID auth will be unavailable.`);
    }
    return;
  }
  if (platform === 'darwin') {
    const artifact = 'anisette';
    if (have(artifact)) return log(`${artifact} already present — skipping (FORCE=1 to rebuild)`);
    if (run('yarn', ['build:helper:macos'], { cwd: appleResign })) {
      copy(path.join(appleResign, 'bin', artifact), path.join(binDir, artifact));
    } else {
      warn('Could not build the macOS anisette helper — check the Xcode toolchain. Apple ID auth will be unavailable.');
    }
    return;
  }
  if (platform === 'win32') {
    const artifact = `anisette-win-${archLabel}.exe`;
    if (have(artifact)) return log(`${artifact} already present — skipping (FORCE=1 to rebuild)`);
    const rustDir = path.join(appleResign, 'anisette', 'orbit-anisette-rs');
    const built = path.join(rustDir, 'target', 'release', 'orbit-anisette.exe');
    const prebuilt = path.join(appleResign, 'bin', artifact);
    if (commandExists('cargo')) {
      log(`Building anisette helper (${artifact}) — native cargo build`);
      if (run('cargo', ['build', '--release'], { cwd: rustDir }) && fs.existsSync(built)) {
        copy(built, path.join(binDir, artifact));
      } else {
        warn('cargo build failed — see anisette/orbit-anisette-rs/README.md. Apple ID auth will be unavailable.');
      }
    } else if (fs.existsSync(prebuilt)) {
      log(`cargo not found — copying prebuilt ${artifact} from apple-resign/bin`);
      copy(prebuilt, path.join(binDir, artifact));
    } else {
      warn(`Cannot provide ${artifact}: rustup/cargo isn't installed and no prebuilt binary exists in apple-resign/bin.`);
      warn("Install Rust (https://rustup.rs), then re-run 'yarn build:helpers'. See anisette/orbit-anisette-rs/README.md.");
    }
    return;
  }
  warn(`Unsupported platform '${platform}' for anisette — build the helper manually (see script header).`);
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
      warn(`No ${artifact} found. Build zsign with VS2022 (zsign build/windows/vs2022) or download a release`);
      warn('from https://github.com/zhlynn/zsign/releases, drop it in apple-resign/bin/, then re-run.');
      warn('Re-signing will be unavailable until then (Apple ID auth still works).');
    }
    return;
  }
  // linux / darwin: clone + make from source.
  const artifact = platform === 'darwin' ? 'zsign' : `zsign-linux-${archLabel}`;
  if (have(artifact)) return log(`${artifact} already present — skipping (FORCE=1 to rebuild)`);
  const zsrc = path.join(cacheDir, 'zsign');
  if (fs.existsSync(path.join(zsrc, '.git'))) {
    log('Updating zsign source');
    run('git', ['-C', zsrc, 'pull', '--ff-only']);
  } else {
    log('Cloning zsign source');
    if (!run('git', ['clone', '--depth', '1', 'https://github.com/zhlynn/zsign.git', zsrc])) {
      warn('Could not clone zsign — re-signing will be unavailable until a zsign binary is on PATH.');
      return;
    }
  }
  const makeDir = path.join(zsrc, 'build', platform === 'darwin' ? 'macos' : 'linux');
  if (run('make', [], { cwd: makeDir })) {
    copy(path.join(zsrc, 'bin', 'zsign'), path.join(binDir, artifact));
  } else {
    warn(`Could not build zsign (${platform}) — re-signing will be unavailable until a zsign binary is on PATH.`);
  }
}

buildAnisette();
buildZsign();

log('Done — helpers in electron/bin:');
for (const file of fs.readdirSync(binDir)) {
  log(`  ${file} (${fs.statSync(path.join(binDir, file)).size} bytes)`);
}
