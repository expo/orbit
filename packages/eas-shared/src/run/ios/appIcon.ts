import fs from 'fs';
import zlib from 'zlib';

import { parsePlistBuffer } from '../../utils/parseBinaryPlistAsync';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type Chunk = { type: string; data: Buffer };

function readChunks(png: Buffer): Chunk[] {
  if (png.length < 8 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Not a PNG file');
  }
  const chunks: Chunk[] = [];
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('latin1', offset + 4, offset + 8);
    chunks.push({ type, data: png.subarray(offset + 8, offset + 8 + length) });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

// Node 18 (the pkg runtime) has no zlib.crc32, so table it here.
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : c >>> 1;
  return c;
});

function crc32(...buffers: Buffer[]): number {
  let crc = 0xffffffff;
  for (const buffer of buffers) {
    for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeBuffer, data));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** Undo PNG scanline filtering: filtered rows (with filter byte) → raw pixel rows. */
function unfilter(data: Buffer, width: number, height: number, bpp: number): Buffer {
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)];
    const src = data.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let value = src[x];
      switch (filter) {
        case 0:
          break;
        case 1:
          value += a;
          break;
        case 2:
          value += b;
          break;
        case 3:
          value += (a + b) >> 1;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default:
          throw new Error(`Unsupported PNG filter ${filter}`);
      }
      row[x] = value & 0xff;
    }
  }
  return out;
}

/**
 * Rewrite an Apple-optimized PNG (`pngcrush -iphone`, marked by a `CgBI` chunk:
 * IDAT without the zlib header, pixels stored BGRA with premultiplied alpha) as
 * a standard PNG — ImageIO on macOS and Chromium refuse the Apple variant.
 * Standard PNGs are returned as they are; null for CgBI variants this does not
 * handle (interlaced, palette or 16-bit).
 */
export function convertCgbiToPng(png: Buffer): Buffer | null {
  const chunks = readChunks(png);
  if (!chunks.some((chunk) => chunk.type === 'CgBI')) return png;
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR');
  if (!ihdr || ihdr.data.length < 13) return null;
  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];
  const interlace = ihdr.data[12];
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bitDepth !== 8 || bpp === 0 || interlace !== 0) return null;

  const idat = Buffer.concat(
    chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)
  );
  const pixels = unfilter(zlib.inflateRawSync(idat), width, height, bpp);
  for (let i = 0; i < pixels.length; i += bpp) {
    const blue = pixels[i];
    pixels[i] = pixels[i + 2];
    pixels[i + 2] = blue;
    if (bpp === 4) {
      const alpha = pixels[i + 3];
      if (alpha > 0 && alpha < 255) {
        for (let k = 0; k < 3; k++) {
          pixels[i + k] = Math.min(255, Math.round((pixels[i + k] * 255) / alpha));
        }
      }
    }
  }

  const stride = width * bpp;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    pixels.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    writeChunk('IHDR', ihdr.data),
    writeChunk('IDAT', zlib.deflateSync(filtered)),
    writeChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The icon file names Info.plist advertises, without extension:
 * `CFBundleIcons*.CFBundlePrimaryIcon.CFBundleIconFiles` (iPhone and `~ipad`
 * variants) plus the legacy top-level `CFBundleIconFiles`.
 */
export function iconBaseNames(infoPlist: Record<string, unknown>): string[] {
  const names: string[] = [];
  for (const [key, value] of Object.entries(infoPlist)) {
    if (!key.startsWith('CFBundleIcons')) continue;
    const files = (value as { CFBundlePrimaryIcon?: { CFBundleIconFiles?: unknown } } | null)
      ?.CFBundlePrimaryIcon?.CFBundleIconFiles;
    if (Array.isArray(files))
      names.push(...files.filter((f): f is string => typeof f === 'string'));
  }
  if (Array.isArray(infoPlist.CFBundleIconFiles)) {
    names.push(...infoPlist.CFBundleIconFiles.filter((f): f is string => typeof f === 'string'));
  }
  return [...new Set(names.map((name) => name.replace(/\.png$/i, '')))];
}

export type ZipEntryInfo = { name: string; size: number };

/**
 * The best icon in the app bundle root: the largest PNG whose name starts with
 * an advertised icon name (`AppIcon60x60@3x.png`, …), or failing that any
 * `AppIcon*.png`. Size stands in for pixel dimensions.
 */
export function pickIconEntry<T extends ZipEntryInfo>(
  entries: T[],
  appRoot: string,
  baseNames: string[]
): T | null {
  const prefix = `${appRoot}/`;
  const rootPngs = entries
    .filter((entry) => entry.name.startsWith(prefix) && /\.png$/i.test(entry.name))
    .map((entry) => ({ entry, file: entry.name.slice(prefix.length) }))
    .filter(({ file }) => !file.includes('/'));
  let candidates = rootPngs.filter(({ file }) => baseNames.some((base) => file.startsWith(base)));
  if (candidates.length === 0) candidates = rootPngs.filter(({ file }) => /^AppIcon/i.test(file));
  return candidates.sort((a, b) => b.entry.size - a.entry.size)[0]?.entry ?? null;
}

// Minimal ZIP reader: Node has no archive API, and the alternatives either
// extract the whole IPA (extract-zip) or add a dependency. An IPA is a plain
// ZIP: central directory at the end, entries stored or raw-deflated.
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;

export type ZipEntry = ZipEntryInfo & {
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

export type ZipReader = {
  entries: ZipEntry[];
  readAsync(entry: ZipEntry): Promise<Buffer>;
  closeAsync(): Promise<void>;
};

async function readAtAsync(
  handle: fs.promises.FileHandle,
  position: number,
  length: number
): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, position);
  return buffer.subarray(0, bytesRead);
}

export async function openZipAsync(file: string): Promise<ZipReader> {
  const handle = await fs.promises.open(file, 'r');
  try {
    const { size: fileSize } = await handle.stat();
    // The end-of-central-directory record is 22 bytes plus a comment of up to
    // 65535 bytes; scan the tail backwards for its signature.
    const tailLength = Math.min(fileSize, 22 + 0xffff);
    const tail = await readAtAsync(handle, fileSize - tailLength, tailLength);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIGNATURE) {
        eocd = i;
        break;
      }
    }
    if (eocd === -1) throw new Error('Not a ZIP file (no end of central directory)');
    const entryCount = tail.readUInt16LE(eocd + 10);
    const directorySize = tail.readUInt32LE(eocd + 12);
    const directoryOffset = tail.readUInt32LE(eocd + 16);
    if (entryCount === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
      throw new Error('ZIP64 archives are not supported');
    }

    const directory = await readAtAsync(handle, directoryOffset, directorySize);
    const entries: ZipEntry[] = [];
    let offset = 0;
    for (let i = 0; i < entryCount && offset + 46 <= directory.length; i++) {
      if (directory.readUInt32LE(offset) !== CENTRAL_DIR_SIGNATURE) {
        throw new Error('Corrupt ZIP central directory');
      }
      const nameLength = directory.readUInt16LE(offset + 28);
      const extraLength = directory.readUInt16LE(offset + 30);
      const commentLength = directory.readUInt16LE(offset + 32);
      entries.push({
        name: directory.toString('utf8', offset + 46, offset + 46 + nameLength),
        method: directory.readUInt16LE(offset + 10),
        compressedSize: directory.readUInt32LE(offset + 20),
        size: directory.readUInt32LE(offset + 24),
        localHeaderOffset: directory.readUInt32LE(offset + 42),
      });
      offset += 46 + nameLength + extraLength + commentLength;
    }

    return {
      entries,
      async readAsync(entry) {
        // Local header: 30 fixed bytes, then name and extra field, then the data.
        const header = await readAtAsync(handle, entry.localHeaderOffset, 30);
        const dataOffset =
          entry.localHeaderOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
        const data = await readAtAsync(handle, dataOffset, entry.compressedSize);
        if (entry.method === 0) return data;
        if (entry.method === 8) return zlib.inflateRawSync(data);
        throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}`);
      },
      closeAsync: () => handle.close(),
    };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

/**
 * Write the app's primary icon from an IPA to `outputPath` as a standard PNG,
 * reading only `Info.plist` and the icon entry from the archive. Resolves false
 * when the IPA has no usable icon.
 */
export async function extractAppIconAsync(ipaPath: string, outputPath: string): Promise<boolean> {
  const zip = await openZipAsync(ipaPath);
  try {
    const infoPlist = zip.entries.find((entry) =>
      /^Payload\/[^/]+\.app\/Info\.plist$/.test(entry.name)
    );
    if (!infoPlist) return false;
    const appRoot = infoPlist.name.slice(0, -'/Info.plist'.length);
    const plist = parsePlistBuffer(await zip.readAsync(infoPlist)) as Record<string, unknown>;
    const icon = pickIconEntry(zip.entries, appRoot, iconBaseNames(plist));
    if (!icon) return false;
    const png = convertCgbiToPng(await zip.readAsync(icon));
    if (!png) return false;
    await fs.promises.writeFile(outputPath, png);
    return true;
  } finally {
    await zip.closeAsync();
  }
}
