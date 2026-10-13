import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

import {
  convertCgbiToPng,
  extractAppIconAsync,
  iconBaseNames,
  openZipAsync,
  pickIconEntry,
} from '../appIcon';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(data, zlib.crc32(typeBuffer)));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function ihdr(width: number, height: number, colorType = 6, interlace = 0): Buffer {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = colorType;
  data[12] = interlace;
  return data;
}

/**
 * Build an Apple-optimized PNG the way pngcrush -iphone does: CgBI chunk, BGRA
 * premultiplied pixels, raw deflate. `rows` are straight-alpha RGBA pixels;
 * `filters` picks the PNG filter per row (0 = none, 1 = Sub).
 */
function cgbiPng(rows: number[][][], filters: number[], interlace = 0): Buffer {
  const height = rows.length;
  const width = rows[0].length;
  const scanlines: Buffer[] = [];
  rows.forEach((row, y) => {
    const raw = Buffer.alloc(width * 4);
    row.forEach(([r, g, b, a], x) => {
      const premultiply = (v: number) => Math.round((v * a) / 255);
      raw.set([premultiply(b), premultiply(g), premultiply(r), a], x * 4);
    });
    const filtered = Buffer.alloc(width * 4 + 1);
    filtered[0] = filters[y];
    for (let i = 0; i < raw.length; i++) {
      const left = filters[y] === 1 && i >= 4 ? raw[i - 4] : 0;
      filtered[i + 1] = (raw[i] - left) & 0xff;
    }
    scanlines.push(filtered);
  });
  return Buffer.concat([
    SIGNATURE,
    chunk('CgBI', Buffer.from([0x50, 0x00, 0x20, 0x06])),
    chunk('IHDR', ihdr(width, height, 6, interlace)),
    chunk('IDAT', zlib.deflateRawSync(Buffer.concat(scanlines))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function parseChunks(png: Buffer) {
  expect(png.subarray(0, 8)).toEqual(SIGNATURE);
  const chunks: { type: string; data: Buffer }[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('latin1', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    const crc = png.readUInt32BE(offset + 8 + length);
    expect(crc).toBe(zlib.crc32(data, zlib.crc32(Buffer.from(type, 'latin1'))));
    chunks.push({ type, data });
    offset += 12 + length;
  }
  return chunks;
}

/** A ZIP archive built by hand: local headers + data, central directory, end record. */
function zipArchive(files: { name: string; data: Buffer; deflate?: boolean }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const payload = file.deflate ? zlib.deflateRawSync(file.data) : file.data;
    const method = file.deflate ? 8 : 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(3, 28); // an extra field, to prove the data offset honours it
    parts.push(local, name, Buffer.from([1, 2, 3]), payload);

    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(method, 10);
    record.writeUInt32LE(payload.length, 20);
    record.writeUInt32LE(file.data.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt16LE(0, 30);
    record.writeUInt16LE(4, 32); // a comment, to prove the directory walk skips it
    record.writeUInt32LE(offset, 42);
    central.push(record, name, Buffer.from('note'));
    offset += 30 + name.length + 3 + payload.length;
  }
  const directory = Buffer.concat(central);
  const eocd = Buffer.alloc(22 + 5);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(5, 20);
  eocd.write('hello', 22); // archive comment after the record
  return Buffer.concat([...parts, directory, eocd]);
}

async function withTempFile(contents: Buffer, fn: (file: string, dir: string) => Promise<void>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-icon-'));
  const file = path.join(dir, 'archive.ipa');
  fs.writeFileSync(file, contents);
  try {
    await fn(file, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const ICON_ROWS = [
  [
    [255, 153, 102, 85],
    [0, 0, 0, 255],
  ],
  [
    [10, 20, 30, 255],
    [40, 50, 60, 255],
  ],
];
const ICON_PIXELS = [0, 255, 153, 102, 85, 0, 0, 0, 255, 0, 10, 20, 30, 255, 40, 50, 60, 255];

describe(convertCgbiToPng, () => {
  it('rewrites a CgBI PNG as a standard RGBA PNG with straight alpha', () => {
    // Alpha 85 = 255/3 so premultiplication round-trips exactly.
    const out = convertCgbiToPng(cgbiPng(ICON_ROWS, [0, 1]));
    expect(out).not.toBeNull();
    const chunks = parseChunks(out!);
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(chunks[0].data).toEqual(ihdr(2, 2));
    expect([...zlib.inflateSync(chunks[1].data)]).toEqual(ICON_PIXELS);
  });

  it('returns standard PNGs untouched', () => {
    const plain = Buffer.concat([
      SIGNATURE,
      chunk('IHDR', ihdr(1, 1)),
      chunk('IDAT', zlib.deflateSync(Buffer.from([0, 1, 2, 3, 4]))),
      chunk('IEND', Buffer.alloc(0)),
    ]);
    expect(convertCgbiToPng(plain)).toBe(plain);
  });

  it('gives up on interlaced CgBI images instead of guessing', () => {
    expect(convertCgbiToPng(cgbiPng([[[1, 2, 3, 255]]], [0], 1))).toBeNull();
  });
});

describe(iconBaseNames, () => {
  it('collects iPhone, iPad and legacy icon names without extensions', () => {
    expect(
      iconBaseNames({
        CFBundleIcons: { CFBundlePrimaryIcon: { CFBundleIconFiles: ['AppIcon60x60'] } },
        'CFBundleIcons~ipad': {
          CFBundlePrimaryIcon: { CFBundleIconFiles: ['AppIcon60x60', 'AppIcon76x76'] },
        },
        CFBundleIconFiles: ['Icon-Small.png'],
      })
    ).toEqual(['AppIcon60x60', 'AppIcon76x76', 'Icon-Small']);
  });
});

describe(pickIconEntry, () => {
  const entries = [
    { name: 'Payload/entangle.app/Info.plist', size: 3566 },
    { name: 'Payload/entangle.app/AppIcon60x60@2x.png', size: 8532 },
    { name: 'Payload/entangle.app/AppIcon76x76@2x~ipad.png', size: 11677 },
    { name: 'Payload/entangle.app/Frameworks/X.framework/AppIcon-huge.png', size: 99999 },
    { name: 'Payload/entangle.app/splash.png', size: 50000 },
  ];

  it('picks the largest advertised icon in the bundle root', () => {
    expect(
      pickIconEntry(entries, 'Payload/entangle.app', ['AppIcon60x60', 'AppIcon76x76'])
    ).toEqual({ name: 'Payload/entangle.app/AppIcon76x76@2x~ipad.png', size: 11677 });
  });

  it('falls back to any AppIcon*.png and ignores nested bundles', () => {
    expect(pickIconEntry(entries, 'Payload/entangle.app', [])?.name).toBe(
      'Payload/entangle.app/AppIcon76x76@2x~ipad.png'
    );
    expect(pickIconEntry([entries[0], entries[4]], 'Payload/entangle.app', [])).toBeNull();
  });
});

describe(openZipAsync, () => {
  it('lists entries from the central directory and reads stored and deflated data', async () => {
    const big = Buffer.alloc(5000, 7);
    const archive = zipArchive([
      { name: 'Payload/A.app/stored.txt', data: Buffer.from('hello') },
      { name: 'Payload/A.app/deflated.bin', data: big, deflate: true },
    ]);
    await withTempFile(archive, async (file) => {
      const zip = await openZipAsync(file);
      try {
        expect(zip.entries.map((e) => [e.name, e.size, e.method])).toEqual([
          ['Payload/A.app/stored.txt', 5, 0],
          ['Payload/A.app/deflated.bin', 5000, 8],
        ]);
        expect((await zip.readAsync(zip.entries[0])).toString()).toBe('hello');
        expect((await zip.readAsync(zip.entries[1])).equals(big)).toBe(true);
      } finally {
        await zip.closeAsync();
      }
    });
  });

  it('rejects files that are not ZIP archives', async () => {
    await withTempFile(Buffer.from('definitely not a zip'), async (file) => {
      await expect(openZipAsync(file)).rejects.toThrow('Not a ZIP file');
    });
  });
});

describe(extractAppIconAsync, () => {
  const infoPlist = Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>' +
      '<key>CFBundleIcons</key><dict><key>CFBundlePrimaryIcon</key><dict>' +
      '<key>CFBundleIconFiles</key><array><string>AppIcon60x60</string></array>' +
      '</dict></dict></dict></plist>'
  );

  it('writes the advertised icon as a standard PNG, reading only what it needs', async () => {
    const archive = zipArchive([
      { name: 'Payload/A.app/Info.plist', data: infoPlist, deflate: true },
      {
        name: 'Payload/A.app/AppIcon60x60@2x.png',
        data: cgbiPng(ICON_ROWS, [0, 1]),
        deflate: true,
      },
      { name: 'Payload/A.app/unrelated.png', data: Buffer.alloc(9000), deflate: false },
    ]);
    await withTempFile(archive, async (file, dir) => {
      const out = path.join(dir, 'icon.png');
      await expect(extractAppIconAsync(file, out)).resolves.toBe(true);
      const chunks = parseChunks(fs.readFileSync(out));
      expect([...zlib.inflateSync(chunks[1].data)]).toEqual(ICON_PIXELS);
    });
  });

  it('resolves false when the app has no icon', async () => {
    const archive = zipArchive([{ name: 'Payload/A.app/Info.plist', data: infoPlist }]);
    await withTempFile(archive, async (file, dir) => {
      await expect(extractAppIconAsync(file, path.join(dir, 'icon.png'))).resolves.toBe(false);
    });
  });
});
