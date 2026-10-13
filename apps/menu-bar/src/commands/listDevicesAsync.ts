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
  // A lost CLI result reaches here as null; JSON.parse(null) is null, not an error.
  if (!stringResult) {
    throw new Error('list-devices returned no output');
  }

  return JSON.parse(stringResult) as DevicesPerPlatform;
};
