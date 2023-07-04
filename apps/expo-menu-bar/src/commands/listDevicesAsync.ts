import MenuBarModule from '../modules/MenuBarModule';

export type Device = {
  name: string;
  osVersion?: string;
  osType: 'iOS' | 'android';
  state: 'Booted' | 'Shutdown';
} & (
  | {
      osType: 'iOS';
      udid: string;
    }
  | {
      osType: 'android';
      pid?: number;
    }
);

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

  return eval(stringResult) as Device[];
};

export function getDeviceOS(device: Device): 'android' | 'ios' {
  return device.osType.toLowerCase() as 'android' | 'ios';
}
