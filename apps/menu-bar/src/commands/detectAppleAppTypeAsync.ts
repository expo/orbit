import { Device } from 'common-types/build/devices';

import MenuBarModule from '../modules/MenuBarModule';

export const detectAppleAppTypeAsync = async (appPath: string) => {
  return (await MenuBarModule.runCli(
    'detect-apple-app-type',
    [appPath],
    console.log
  )) as Device['deviceType'];
};
