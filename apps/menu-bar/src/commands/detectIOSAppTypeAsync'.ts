import { Device } from 'common-types/build/devices';

import MenuBarModule from '../modules/MenuBarModule';

export const detectIOSAppTypeAsync = async (appPath: string) => {
  return (await MenuBarModule.runCli(
    'detect-ios-app-type',
    [appPath],
    console.log
  )) as Device['deviceType'];
};
