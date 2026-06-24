import { open } from 'fs/promises';
import { inflateRawSync } from 'zlib';

/**
 * Read the package name and launchable activity straight out of an APK, without
 * the Android SDK build-tools (`aapt`).
 *
 * An APK is a zip archive containing `AndroidManifest.xml` in Android's binary
 * XML format. We extract that single entry and parse the bits we need. This is a
 * deliberately small parser — just enough for the package name and the MAIN /
 * LAUNCHER activity — not a general-purpose AXML reader.
 */
export async function readApkManifestParametersAsync(
  apkPath: string
): Promise<{ packageName: string; activityName?: string }> {
  const manifestBytes = await extractAndroidManifestAsync(apkPath);
  const { packageName, activityName } = parseBinaryManifest(manifestBytes);
  if (!packageName) {
    throw new Error(`Could not read the package name from ${apkPath}`);
  }
  return {
    packageName,
    activityName: resolveActivityName(packageName, activityName),
  };
}

/**
 * `android:name` may be relative (".MainActivity") or unqualified
 * ("MainActivity"); expand it to the fully qualified component name that aapt
 * would report and that `am start -n package/activity` expects.
 */
function resolveActivityName(packageName: string, activityName?: string): string | undefined {
  if (!activityName) {
    return undefined;
  }
  if (activityName.startsWith('.')) {
    return `${packageName}${activityName}`;
  }
  if (!activityName.includes('.')) {
    return `${packageName}.${activityName}`;
  }
  return activityName;
}

// --- Zip extraction (just the AndroidManifest.xml entry) --------------------

const EOCD_SIGNATURE = 0x06054b50; // End of central directory record
const CENTRAL_FILE_SIGNATURE = 0x02014b50; // Central directory file header
const LOCAL_FILE_SIGNATURE = 0x04034b50; // Local file header
const MANIFEST_ENTRY = 'AndroidManifest.xml';

async function extractAndroidManifestAsync(apkPath: string): Promise<Buffer> {
  const fd = await open(apkPath, 'r');
  try {
    const { size } = await fd.stat();

    // 1. Locate the End Of Central Directory record by scanning the tail (its
    //    offset is variable because of the optional trailing zip comment).
    const tailLength = Math.min(size, 22 + 0xffff);
    const tail = await readExact(fd, tailLength, size - tailLength);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIGNATURE) {
        eocd = i;
        break;
      }
    }
    if (eocd === -1) {
      throw new Error('not a valid APK (no zip end-of-central-directory record)');
    }
    const centralDirSize = tail.readUInt32LE(eocd + 12);
    const centralDirOffset = tail.readUInt32LE(eocd + 16);

    // 2. Walk the central directory to find the AndroidManifest.xml entry.
    const centralDir = await readExact(fd, centralDirSize, centralDirOffset);
    let entry: {
      compressionMethod: number;
      compressedSize: number;
      localHeaderOffset: number;
    } | null = null;
    let p = 0;
    while (p + 46 <= centralDir.length && centralDir.readUInt32LE(p) === CENTRAL_FILE_SIGNATURE) {
      const compressionMethod = centralDir.readUInt16LE(p + 10);
      const compressedSize = centralDir.readUInt32LE(p + 20);
      const nameLength = centralDir.readUInt16LE(p + 28);
      const extraLength = centralDir.readUInt16LE(p + 30);
      const commentLength = centralDir.readUInt16LE(p + 32);
      const localHeaderOffset = centralDir.readUInt32LE(p + 42);
      const name = centralDir.toString('utf8', p + 46, p + 46 + nameLength);
      if (name === MANIFEST_ENTRY) {
        entry = { compressionMethod, compressedSize, localHeaderOffset };
        break;
      }
      p += 46 + nameLength + extraLength + commentLength;
    }
    if (!entry) {
      throw new Error(`APK does not contain ${MANIFEST_ENTRY}`);
    }

    // 3. The local header repeats the name/extra fields (and their lengths can
    //    differ from the central directory), so read it to find the data start.
    const localHeader = await readExact(fd, 30, entry.localHeaderOffset);
    if (localHeader.readUInt32LE(0) !== LOCAL_FILE_SIGNATURE) {
      throw new Error('malformed APK (bad local file header)');
    }
    const dataOffset =
      entry.localHeaderOffset + 30 + localHeader.readUInt16LE(26) + localHeader.readUInt16LE(28);
    const compressed = await readExact(fd, entry.compressedSize, dataOffset);

    // method 0 = stored, method 8 = deflate.
    if (entry.compressionMethod === 0) {
      return compressed;
    }
    if (entry.compressionMethod === 8) {
      return inflateRawSync(compressed);
    }
    throw new Error(`unsupported zip compression method ${entry.compressionMethod}`);
  } finally {
    await fd.close();
  }
}

async function readExact(
  fd: Awaited<ReturnType<typeof open>>,
  length: number,
  position: number
): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  let bytesRead = 0;
  while (bytesRead < length) {
    const { bytesRead: n } = await fd.read(
      buffer,
      bytesRead,
      length - bytesRead,
      position + bytesRead
    );
    if (n === 0) {
      break; // EOF
    }
    bytesRead += n;
  }
  return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
}

// --- Android binary XML (AXML) parsing --------------------------------------

const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_START_ELEMENT_TYPE = 0x0102;
const RES_XML_END_ELEMENT_TYPE = 0x0103;
const UTF8_FLAG = 1 << 8;
const TYPE_STRING = 0x03;
const NO_ENTRY = 0xffffffff;

const ACTION_MAIN = 'android.intent.action.MAIN';
const CATEGORY_LAUNCHER = 'android.intent.category.LAUNCHER';

/**
 * Single linear pass over the AXML chunks: read the string pool, then track
 * enough element state to capture the manifest's `package` and the first
 * activity (or alias) declaring a MAIN action + LAUNCHER category.
 */
function parseBinaryManifest(buffer: Buffer): { packageName?: string; activityName?: string } {
  let strings: string[] = [];
  let packageName: string | undefined;
  let activityName: string | undefined;

  // Launcher detection state.
  let currentActivity: string | undefined;
  let inIntentFilter = false;
  let intentHasMain = false;
  let intentHasLauncher = false;

  let offset = buffer.readUInt16LE(2); // skip the file header (its headerSize)
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.readUInt16LE(offset);
    const headerSize = buffer.readUInt16LE(offset + 2);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkSize < 8) {
      break; // guard against malformed input / infinite loops
    }

    if (chunkType === RES_STRING_POOL_TYPE) {
      strings = parseStringPool(buffer, offset);
    } else if (chunkType === RES_XML_START_ELEMENT_TYPE) {
      const name = getString(strings, buffer.readUInt32LE(offset + headerSize + 4));
      const attrs = readAttributes(buffer, offset, headerSize, strings);
      if (name === 'manifest' && !packageName) {
        packageName = attrs.get('package');
      } else if (name === 'activity' || name === 'activity-alias') {
        currentActivity = attrs.get('name');
      } else if (name === 'intent-filter') {
        inIntentFilter = true;
        intentHasMain = false;
        intentHasLauncher = false;
      } else if (name === 'action' && inIntentFilter) {
        intentHasMain ||= attrs.get('name') === ACTION_MAIN;
      } else if (name === 'category' && inIntentFilter) {
        intentHasLauncher ||= attrs.get('name') === CATEGORY_LAUNCHER;
      }
    } else if (chunkType === RES_XML_END_ELEMENT_TYPE) {
      const name = getString(strings, buffer.readUInt32LE(offset + headerSize + 4));
      if (name === 'intent-filter') {
        if (intentHasMain && intentHasLauncher && currentActivity && !activityName) {
          activityName = currentActivity;
        }
        inIntentFilter = false;
      } else if (name === 'activity' || name === 'activity-alias') {
        currentActivity = undefined;
      }
    }

    offset += chunkSize;
  }

  return { packageName, activityName };
}

function parseStringPool(buffer: Buffer, chunkOffset: number): string[] {
  const headerSize = buffer.readUInt16LE(chunkOffset + 2);
  const stringCount = buffer.readUInt32LE(chunkOffset + 8);
  const flags = buffer.readUInt32LE(chunkOffset + 16);
  const stringsStart = buffer.readUInt32LE(chunkOffset + 20);
  const isUtf8 = (flags & UTF8_FLAG) !== 0;

  const offsetsBase = chunkOffset + headerSize;
  const stringsBase = chunkOffset + stringsStart;
  const strings: string[] = new Array(stringCount);
  for (let i = 0; i < stringCount; i++) {
    const at = stringsBase + buffer.readUInt32LE(offsetsBase + i * 4);
    strings[i] = isUtf8 ? readUtf8String(buffer, at) : readUtf16String(buffer, at);
  }
  return strings;
}

// String pool lengths use a high-bit continuation scheme: if the high bit of
// the first unit is set, the value spans two units.
function readUtf8String(buffer: Buffer, offset: number): string {
  let p = offset;
  // Skip the UTF-16 character count; we only need the byte length that follows.
  if (buffer[p++] & 0x80) {
    p++;
  }
  let byteLength = buffer[p++];
  if (byteLength & 0x80) {
    byteLength = ((byteLength & 0x7f) << 8) | buffer[p++];
  }
  return buffer.toString('utf8', p, p + byteLength);
}

function readUtf16String(buffer: Buffer, offset: number): string {
  let p = offset;
  let charLength = buffer.readUInt16LE(p);
  p += 2;
  if (charLength & 0x8000) {
    charLength = ((charLength & 0x7fff) << 16) | buffer.readUInt16LE(p);
    p += 2;
  }
  return buffer.toString('utf16le', p, p + charLength * 2);
}

function readAttributes(
  buffer: Buffer,
  chunkOffset: number,
  headerSize: number,
  strings: string[]
): Map<string, string> {
  const extBase = chunkOffset + headerSize; // ResXMLTree_attrExt
  const attributeStart = buffer.readUInt16LE(extBase + 8);
  const attributeSize = buffer.readUInt16LE(extBase + 10);
  const attributeCount = buffer.readUInt16LE(extBase + 12);

  const attrs = new Map<string, string>();
  let attrOffset = extBase + attributeStart;
  for (let i = 0; i < attributeCount; i++) {
    const name = getString(strings, buffer.readUInt32LE(attrOffset + 4));
    const rawValueRef = buffer.readUInt32LE(attrOffset + 8);
    const dataType = buffer.readUInt8(attrOffset + 15);
    const data = buffer.readUInt32LE(attrOffset + 16);
    // Prefer the raw string value; fall back to a string-typed value reference.
    const value =
      rawValueRef !== NO_ENTRY
        ? getString(strings, rawValueRef)
        : dataType === TYPE_STRING
          ? getString(strings, data)
          : undefined;
    if (name !== undefined && value !== undefined) {
      attrs.set(name, value);
    }
    attrOffset += attributeSize;
  }
  return attrs;
}

function getString(strings: string[], ref: number): string | undefined {
  return ref === NO_ENTRY || ref >= strings.length ? undefined : strings[ref];
}
