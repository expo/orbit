import { DevicesPerPlatform } from 'common-types/build/cli-commands/listDevices';
import { Device, IosSimulator, AndroidEmulator } from 'common-types/build/devices';
import { SectionListData } from 'react-native';

export type BaseDevice = {
  name: string;
  osVersion?: string;
  osType: 'iOS' | 'android';
  state?: 'Booted' | 'Shutdown';
} & (
  | {
      deviceType: 'device';
      connectionType?: 'USB' | 'Network';
    }
  | {
      deviceType: 'simulator' | 'emulator';
    }
);

export function getDeviceOS(device: Device): 'android' | 'ios' {
  return device.osType.toLowerCase() as 'android' | 'ios';
}

export function getDeviceId(device: Device): string {
  return device.osType === 'iOS' ? device.udid : device.name;
}

export function getSectionsFromDeviceList(
  devicesPerPlatform: DevicesPerPlatform
): SectionListData<
  Device,
  { label: string; error?: DevicesPerPlatform[keyof DevicesPerPlatform]['error'] }
>[] {
  const sections = [
    {
      data: devicesPerPlatform.ios.devices,
      key: 'ios',
      label: 'iOS',
      error: devicesPerPlatform.ios.error,
    },
    {
      data: devicesPerPlatform.android.devices,
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
