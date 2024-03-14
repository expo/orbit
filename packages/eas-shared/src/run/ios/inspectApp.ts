import path from 'path';

import { parseBinaryPlistAsync } from '../../utils/parseBinaryPlistAsync';

export async function detectIOSAppType(appPath: string): Promise<'device' | 'simulator'> {
  const builtInfoPlistPath = path.join(appPath, 'Info.plist');
  const { DTPlatformName }: { DTPlatformName: string } =
    await parseBinaryPlistAsync(builtInfoPlistPath);

  return DTPlatformName.includes('simulator') ? 'simulator' : 'device';
}
