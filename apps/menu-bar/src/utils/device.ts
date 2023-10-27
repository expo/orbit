import { CliCommands } from 'common-types';
import { Device, IosSimulator, AndroidEmulator } from 'common-types/build/devices';
import { SectionListData } from 'react-native';

export type DevicesPerPlatform = {
  [P in Exclude<CliCommands.Platform, CliCommands.Platform.All>]: {
    devices: Map<string, CliCommands.ListDevices.Device<P>>;
    error?: { code: string; message: string };
  };
};

export function getDeviceOS(device: Device): 'android' | 'ios' {
  if (device.osType === 'tvOS') {
    return 'ios';
  }
  return device.osType.toLowerCase() as 'android' | 'ios';
}

export function getDeviceId(device: Device): string {
  return device.osType === 'iOS' || device.osType === 'tvOS' ? device.udid : device.name;
}

export function getSectionsFromDeviceList(
  devicesPerPlatform: DevicesPerPlatform
): SectionListData<
  Device,
  { label: string; error?: DevicesPerPlatform[keyof DevicesPerPlatform]['error'] }
>[] {
  const sections = [
    {
      data: Array.from(devicesPerPlatform.ios.devices.values()),
      key: 'ios',
      label: 'iOS',
      error: devicesPerPlatform.ios.error,
    },
    {
      data: Array.from(devicesPerPlatform.android.devices.values()),
      key: 'android',
      label: 'Android',
      error: devicesPerPlatform.android.error,
    },
  ];

  return sections.filter((section) => section.data.length > 0 || section.error);
}

export function isVirtualDevice(device: Device): device is IosSimulator | AndroidEmulator {
  return device.deviceType === 'simulator' || device.deviceType === 'emulator';
}
