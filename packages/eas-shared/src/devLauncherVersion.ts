import path from 'path';
import yauzl from 'yauzl';

import { parseBinaryPlistAsync } from './utils/parseBinaryPlistAsync';

const BUILD_CONFIG_DESCRIPTOR = 'Lexpo/modules/devlauncher/BuildConfig;';

/**
 * Returns the `expo-dev-launcher` version of an iOS `.app` or an Android `.apk`, or `null` when the
 * app does not include the launcher.
 */
export async function getDevLauncherVersionAsync(appPath: string): Promise<string | null> {
  try {
    if (appPath.endsWith('.apk')) {
      return await getVersionFromApkAsync(appPath);
    }
    const info = await parseBinaryPlistAsync(
      path.join(appPath, 'EXDevLauncher.bundle', 'Info.plist')
    );
    return info?.CFBundleShortVersionString ?? null;
  } catch {
    return null;
  }
}

/** Reads the `VERSION` constant of the launcher `BuildConfig` class from the APK dex files. */
async function getVersionFromApkAsync(apkPath: string): Promise<string | null> {
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) =>
    yauzl.open(apkPath, { lazyEntries: true }, (error, file) =>
      error ? reject(error) : resolve(file!)
    )
  );
  try {
    for await (const entry of readEntries(zip)) {
      if (!/^classes\d*\.dex$/.test(entry.fileName)) {
        continue;
      }
      const version = readBuildConfigVersion(await readEntry(zip, entry));
      if (version) {
        return version;
      }
    }
    return null;
  } finally {
    zip.close();
  }
}

async function* readEntries(zip: yauzl.ZipFile): AsyncGenerator<yauzl.Entry> {
  while (true) {
    const entry = await new Promise<yauzl.Entry | null>((resolve, reject) => {
      zip.once('entry', resolve);
      zip.once('end', () => resolve(null));
      zip.once('error', reject);
      zip.readEntry();
    });
    zip.removeAllListeners();
    if (!entry) {
      return;
    }
    yield entry;
  }
}

function readEntry(zip: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    zip.openReadStream(entry, (error, stream) => {
      if (error) {
        return reject(error);
      }
      const chunks: Buffer[] = [];
      stream!.on('data', (chunk) => chunks.push(chunk));
      stream!.on('end', () => resolve(Buffer.concat(chunks)));
      stream!.on('error', reject);
    })
  );
}

/**
 * Minimal dex reader: finds the `BuildConfig` class and returns the string value of its `VERSION`
 * static field. Format: https://source.android.com/docs/core/runtime/dex-format
 */
export function readBuildConfigVersion(dex: Buffer): string | null {
  const stringIdsOff = dex.readUInt32LE(0x3c);
  const typeIdsOff = dex.readUInt32LE(0x44);
  const fieldIdsOff = dex.readUInt32LE(0x54);
  const classDefsSize = dex.readUInt32LE(0x60);
  const classDefsOff = dex.readUInt32LE(0x64);

  const readString = (index: number) => {
    let offset = dex.readUInt32LE(stringIdsOff + index * 4);
    // Skips the uleb128 UTF-16 length. The descriptors and the version are ASCII.
    while (dex[offset++] & 0x80);
    return dex.toString('latin1', offset, dex.indexOf(0, offset));
  };
  const readType = (index: number) => readString(dex.readUInt32LE(typeIdsOff + index * 4));

  for (let i = 0; i < classDefsSize; i++) {
    const classDef = classDefsOff + i * 32;
    if (readType(dex.readUInt32LE(classDef)) !== BUILD_CONFIG_DESCRIPTOR) {
      continue;
    }
    const classDataOff = dex.readUInt32LE(classDef + 24);
    const staticValuesOff = dex.readUInt32LE(classDef + 28);
    if (!classDataOff || !staticValuesOff) {
      return null;
    }

    let offset = classDataOff;
    const readUleb = () => {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = dex[offset++];
        result |= (byte & 0x7f) << shift;
        shift += 7;
      } while (byte & 0x80);
      return result >>> 0;
    };

    const staticFieldsSize = readUleb();
    readUleb(); // instance_fields_size
    readUleb(); // direct_methods_size
    readUleb(); // virtual_methods_size
    const fieldNames: string[] = [];
    let fieldIndex = 0;
    for (let j = 0; j < staticFieldsSize; j++) {
      fieldIndex += readUleb();
      readUleb(); // access_flags
      fieldNames.push(readString(dex.readUInt32LE(fieldIdsOff + fieldIndex * 8 + 4)));
    }

    // `static_values` lists the initial values in field order. It can end before the last field.
    offset = staticValuesOff;
    const valuesSize = readUleb();
    for (let j = 0; j < valuesSize; j++) {
      const header = dex[offset++];
      const type = header & 0x1f;
      const arg = header >> 5;
      // Null and boolean values have no payload. A `BuildConfig` has no arrays or annotations.
      const size = type === 0x1e || type === 0x1f ? 0 : arg + 1;
      if (fieldNames[j] === 'VERSION' && type === 0x17) {
        return readString(dex.readUIntLE(offset, size));
      }
      offset += size;
    }
    return null;
  }
  return null;
}
