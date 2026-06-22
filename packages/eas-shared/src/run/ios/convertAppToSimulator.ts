import spawnAsync from '@expo/spawn-async';
import { randomUUID } from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import Log from '../../log';

// PLATFORM_IOSSIMULATOR from <mach-o/loader.h>. Device builds are tagged
// PLATFORM_IOS (2); the simulator runtime only accepts (7).
const PLATFORM_IOSSIMULATOR = '7';

// Mach-O / fat magic numbers, read big-endian from the first 4 bytes on disk.
const MACH_O_MAGICS = new Set([
  0xfeedface, // MH_MAGIC (32-bit, BE)
  0xfeedfacf, // MH_MAGIC_64 (64-bit, BE)
  0xcefaedfe, // MH_CIGAM (32-bit, LE)
  0xcffaedfe, // MH_CIGAM_64 (64-bit, LE)
  0xcafebabe, // FAT_MAGIC
  0xbebafeca, // FAT_CIGAM
]);
const FAT_MAGICS = new Set([0xcafebabe, 0xbebafeca]);

async function readMagicAsync(filePath: string): Promise<number | null> {
  let fd: fs.promises.FileHandle | undefined;
  try {
    fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(4);
    const { bytesRead } = await fd.read(buffer, 0, 4, 0);
    return bytesRead === 4 ? buffer.readUInt32BE(0) : null;
  } catch {
    return null;
  } finally {
    await fd?.close();
  }
}

/**
 * Recursively yields regular files inside `dir`, without following symlinks
 * (framework version symlinks would otherwise cause duplicate work).
 */
async function* walkFilesAsync(dir: string): AsyncGenerator<string> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      yield* walkFilesAsync(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

async function getMinOsAndSdkAsync(machoPath: string): Promise<{ minos: string; sdk: string }> {
  try {
    const { stdout } = await spawnAsync('vtool', ['-show-build', machoPath]);
    const minos = stdout.match(/minos\s+([\d.]+)/)?.[1];
    const sdk = stdout.match(/sdk\s+([\d.]+)/)?.[1];
    return { minos: minos ?? '13.0', sdk: sdk ?? minos ?? '13.0' };
  } catch {
    return { minos: '13.0', sdk: '13.0' };
  }
}

async function isFairPlayEncryptedAsync(machoPath: string): Promise<boolean> {
  try {
    const { stdout } = await spawnAsync('otool', ['-l', machoPath]);
    // A cryptid of 1 means the binary is FairPlay-encrypted (App Store build).
    return /LC_ENCRYPTION_INFO[\s\S]*?cryptid 1\b/.test(stdout);
  } catch {
    return false;
  }
}

async function retagMachoAsync(machoPath: string, appPath: string): Promise<void> {
  const magic = await readMagicAsync(machoPath);
  if (magic === null || !MACH_O_MAGICS.has(magic)) {
    return;
  }

  // Apple Silicon simulators run the arm64 slice; drop any other slices so the
  // re-tagged binary matches what the simulator can load.
  if (FAT_MAGICS.has(magic)) {
    const thinned = `${machoPath}.__thin`;
    try {
      await spawnAsync('lipo', [machoPath, '-thin', 'arm64', '-output', thinned]);
      await fs.move(thinned, machoPath, { overwrite: true });
    } catch {
      await fs.remove(thinned).catch(() => {});
    }
  }

  const { minos, sdk } = await getMinOsAndSdkAsync(machoPath);
  const retagged = `${machoPath}.__retagged`;
  try {
    await spawnAsync('vtool', [
      '-set-build-version',
      PLATFORM_IOSSIMULATOR,
      minos,
      sdk,
      '-replace',
      '-output',
      retagged,
      machoPath,
    ]);
    await fs.move(retagged, machoPath, { overwrite: true });
    Log.debug(`Re-tagged ${path.relative(appPath, machoPath)} -> iOS-Simulator`);
  } catch (error: any) {
    await fs.remove(retagged).catch(() => {});
    throw new Error(
      `Failed to re-tag ${path.relative(appPath, machoPath)} for the simulator: ${error.message}`
    );
  }
}

async function codesignAsync(target: string): Promise<void> {
  await spawnAsync('codesign', ['--force', '--sign', '-', '--timestamp=none', target]);
}

/**
 * Re-tags an iOS *device* `.app` so it can be installed and launched on the
 * iOS Simulator, then re-signs it ad-hoc. Works on a copy so the original
 * (cached) device build is left untouched for physical-device installs.
 *
 * This is a best-effort, experimental conversion: it clears the install-time
 * platform/signature gates, but an app that links device-only frameworks may
 * still crash on launch. App Store (FairPlay-encrypted) builds cannot be
 * converted and are rejected.
 *
 * @returns the path to the converted `.app` bundle.
 */
export async function convertDeviceAppToSimulatorAsync(appPath: string): Promise<string> {
  if (process.platform !== 'darwin') {
    throw new Error('Converting device builds to run on the simulator is only supported on macOS.');
  }

  Log.newLine();
  Log.log('Converting device build to run on the simulator (experimental)...');

  const workDir = path.join(os.tmpdir(), 'orbit-sim-convert', randomUUID());
  await fs.mkdirp(workDir);
  const convertedAppPath = path.join(workDir, path.basename(appPath));
  await fs.copy(appPath, convertedAppPath, { dereference: false });

  const infoPlistPath = path.join(convertedAppPath, 'Info.plist');
  const { stdout: mainExecutable } = await spawnAsync('/usr/libexec/PlistBuddy', [
    '-c',
    'Print :CFBundleExecutable',
    infoPlistPath,
  ]);
  const mainExecutablePath = path.join(convertedAppPath, mainExecutable.trim());

  if (await isFairPlayEncryptedAsync(mainExecutablePath)) {
    await fs.remove(workDir).catch(() => {});
    throw new Error(
      'This is a FairPlay-encrypted App Store build, which cannot run on the simulator. Use a build made with the simulator SDK instead.'
    );
  }

  // 1. Re-tag every Mach-O binary in the bundle.
  for await (const filePath of walkFilesAsync(convertedAppPath)) {
    await retagMachoAsync(filePath, convertedAppPath);
  }

  // 2. Update the Info.plist metadata so it matches the re-tagged binaries.
  await spawnAsync('plutil', [
    '-replace',
    'DTPlatformName',
    '-string',
    'iphonesimulator',
    infoPlistPath,
  ]).catch(() => {});
  await spawnAsync('plutil', [
    '-replace',
    'CFBundleSupportedPlatforms',
    '-json',
    '["iPhoneSimulator"]',
    infoPlistPath,
  ]).catch(() => {});

  // 3. Re-sign ad-hoc, inner-out: nested code first (deepest paths), then the
  //    app bundle itself, which seals everything signed above. `codesign
  //    --deep` is unreliable on large bundles, so we sign explicitly.
  const nestedCode: string[] = [];
  for await (const filePath of walkFilesAsync(convertedAppPath)) {
    if (filePath.endsWith('.dylib')) {
      nestedCode.push(filePath);
    }
  }
  const collectDirs = async (dir: string): Promise<void> => {
    for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (
        fullPath !== convertedAppPath &&
        (fullPath.endsWith('.framework') ||
          fullPath.endsWith('.appex') ||
          fullPath.endsWith('.app'))
      ) {
        nestedCode.push(fullPath);
      }
      await collectDirs(fullPath);
    }
  };
  await collectDirs(convertedAppPath);

  // Sign deepest paths first so containers seal already-signed contents.
  nestedCode.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);
  for (const target of nestedCode) {
    await codesignAsync(target).catch((error) =>
      Log.debug(`codesign failed for ${path.relative(convertedAppPath, target)}: ${error.message}`)
    );
  }
  await codesignAsync(convertedAppPath);

  Log.succeed('Converted the device build to run on the simulator.');
  return convertedAppPath;
}
