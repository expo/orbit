import { DevicesPerPlatform } from 'common-types/build/cli-commands/listDevices';

import MenuBarModule from '../modules/MenuBarModule';

type ListDevicesAsyncOptions = {
  platform: 'android' | 'ios' | 'all';
};

export const listDevicesAsync = async ({ platform }: ListDevicesAsyncOptions) => {
  const args: string[] = [];
  if (platform) {
    args.push('-p', platform);
  }

  const stringResult = await MenuBarModule.runCli('list-devices', args, undefined);

  return JSON.parse(stringResult) as DevicesPerPlatform;
};
