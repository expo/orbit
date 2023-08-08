import MenuBarModule from '../modules/MenuBarModule';
import {Device} from '../utils/device';

type ListDevicesAsyncOptions = {
  platform: 'android' | 'ios' | 'all';
};

export const listDevicesAsync = async ({platform}: ListDevicesAsyncOptions) => {
  let args: string[] = [];
  if (platform) {
    args.push('-p', platform);
  }

  const stringResult = await MenuBarModule.runCli(
    'list-devices',
    args,
    undefined,
  );

  if (!stringResult) {
    return [];
  }

  // eslint-disable-next-line no-eval
  return eval(stringResult) as Device[];
};