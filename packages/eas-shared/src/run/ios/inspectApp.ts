import fs from 'fs-extra';
import path from 'path';

import { parseBinaryPlistAsync } from '../../utils/parseBinaryPlistAsync';

export type AppleAppInfo = {
  deviceType: 'device' | 'simulator';
  osType: 'iOS' | 'tvOS' | 'watchOS';
};

export async function detectAppleAppType(appPath: string): Promise<AppleAppInfo> {
  const builtInfoPlistPath = path.join(appPath, 'Info.plist');
  if (!fs.existsSync(builtInfoPlistPath)) {
    return { deviceType: 'device', osType: 'iOS' };
  }

  const { DTPlatformName }: { DTPlatformName: string } =
    await parseBinaryPlistAsync(builtInfoPlistPath);

  const deviceType: AppleAppInfo['deviceType'] = DTPlatformName.includes('simulator')
    ? 'simulator'
    : 'device';

  let osType: AppleAppInfo['osType'] = 'iOS';
  if (DTPlatformName.includes('watch')) {
    osType = 'watchOS';
  } else if (DTPlatformName.includes('tv')) {
    osType = 'tvOS';
  }

  return { deviceType, osType };
}
