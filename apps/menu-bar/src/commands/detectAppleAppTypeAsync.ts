import { IosSimulator, TVosSimulator, WatchosSimulator } from 'common-types/build/devices';

import MenuBarModule from '../modules/MenuBarModule';

export type AppleAppInfo = {
  deviceType: 'device' | 'simulator';
  osType: (IosSimulator | TVosSimulator | WatchosSimulator)['osType'];
};

export const detectAppleAppTypeAsync = async (appPath: string): Promise<AppleAppInfo> => {
  const result = await MenuBarModule.runCli('detect-apple-app-type', [appPath], console.log);

  return JSON.parse(result) as AppleAppInfo;
};
