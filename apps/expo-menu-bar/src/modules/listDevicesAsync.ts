import MenuBarModule from '../MenuBarModule';

type ListDevicesAsyncOptions = {
  platform: 'android' | 'ios' | 'all';
  oneDevice?: boolean;
};

export const listDevicesAsync = async ({
  platform,
  oneDevice,
}: ListDevicesAsyncOptions) => {
  let args: string[] = [];
  if (platform) {
    args.push('-p', platform);
  }

  if (oneDevice) {
    args.push('-od');
  }

  const stringResult = await MenuBarModule.runCli(
    'list-devices',
    args,
    undefined,
  );

  if (!stringResult) {
    return [];
  }

  return eval(stringResult);
};
