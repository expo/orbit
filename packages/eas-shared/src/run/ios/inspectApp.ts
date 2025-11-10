import fs from 'fs-extra';
import path from 'path';

import { parseBinaryPlistAsync } from '../../utils/parseBinaryPlistAsync';

export async function detectAppleAppType(
  appPath: string
): Promise<'iphone' | 'macos' | 'simulator'> {
  const builtInfoPlistPath = path.join(appPath, 'Info.plist');
  if (!fs.existsSync(builtInfoPlistPath)) {
    return 'iphone';
  }

  const { DTPlatformName }: { DTPlatformName: string } =
    await parseBinaryPlistAsync(builtInfoPlistPath);

  return DTPlatformName.includes('simulator') ? 'simulator' : 'iphone';
}
