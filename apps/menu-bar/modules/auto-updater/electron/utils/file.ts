import crypto from 'crypto';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export function calcSha256Hash(filePath: string): Promise<string> {
  const stream = fs.createReadStream(filePath);
  const shaSum = crypto.createHash('sha256');

  return new Promise((resolve, reject) => {
    stream
      .on('data', (data) => shaSum.update(data))
      .on('end', () => resolve(shaSum.digest('hex')))
      .on('error', reject);
  });
}

export function readPackageJson(appPath: string | undefined) {
  try {
    const packageFile = path.join(appPath || app.getAppPath(), 'package.json');
    const content = fs.readFileSync(packageFile, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.log('Error reading package.json', e);
    return {};
  }
}
