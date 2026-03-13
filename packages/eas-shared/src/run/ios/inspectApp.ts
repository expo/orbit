import { CliCommands } from 'common-types';
import fs from 'fs-extra';
import path from 'path';

import { parseBinaryPlistAsync } from '../../utils/parseBinaryPlistAsync';

export type AppleAppInfo = CliCommands.DetectAppleAppType.AppleAppInfo;

export async function detectAppleAppType(appPath: string): Promise<AppleAppInfo> {
  // iOS/tvOS/watchOS apps have Info.plist at the root, macOS apps nest it under Contents/
  let builtInfoPlistPath = path.join(appPath, 'Info.plist');
  if (!fs.existsSync(builtInfoPlistPath)) {
    builtInfoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
  }
  if (!fs.existsSync(builtInfoPlistPath)) {
    return { deviceType: 'device', osType: 'iOS' };
  }

  const { DTPlatformName }: { DTPlatformName: string } =
    await parseBinaryPlistAsync(builtInfoPlistPath);

  const deviceType: AppleAppInfo['deviceType'] = DTPlatformName.includes('simulator')
    ? 'simulator'
    : 'device';

  let osType: AppleAppInfo['osType'] = 'iOS';
  if (DTPlatformName.includes('macos')) {
    osType = 'macOS';
  } else if (DTPlatformName.includes('watch')) {
    osType = 'watchOS';
  } else if (DTPlatformName.includes('tv')) {
    osType = 'tvOS';
  }

  return { deviceType, osType };
}
