import fs from 'fs';
import os from 'os';
import path from 'path';

import { cleanupResignedAppsAsync } from '../CleanupResignedApps';

describe(cleanupResignedAppsAsync, () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'resigned-apps-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('removes directories not in the keep list and keeps the rest', async () => {
    fs.mkdirSync(path.join(root, 'keep-me'));
    fs.mkdirSync(path.join(root, 'orphan'));
    fs.writeFileSync(path.join(root, 'orphan', 'resigned.ipa'), 'x');
    fs.writeFileSync(path.join(root, 'a-file.txt'), 'not a dir');

    const result = await cleanupResignedAppsAsync({
      dir: root,
      keep: JSON.stringify(['keep-me']),
    });

    expect(result.removed).toEqual(['orphan']);
    expect(fs.existsSync(path.join(root, 'keep-me'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'orphan'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'a-file.txt'))).toBe(true);
  });

  it('returns empty for a missing managed dir', async () => {
    const result = await cleanupResignedAppsAsync({
      dir: path.join(root, 'does-not-exist'),
      keep: '[]',
    });
    expect(result.removed).toEqual([]);
  });
});
