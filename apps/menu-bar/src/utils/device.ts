import { Device, IosSimulator, AndroidEmulator } from 'common-types/devices';
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
  devices: Device[]
): SectionListData<Device, { label: string }>[] {
  const sections = devices
    .reduce(
      (acc, device) => {
        if (device.osType === 'iOS') {
          acc[0].data.push(device);
        } else {
          acc[1].data.push(device);
        }

        return acc;
      },
      [
        {
          data: [] as Device[],
          key: 'ios',
          label: 'iOS',
        },
        {
          data: [] as Device[],
          key: 'android',
          label: 'Android',
        },
      ]
    )
    .filter((section) => section.data.length > 0);

  return sections;
}

export function isVirtualDevice(device: Device): device is IosSimulator | AndroidEmulator {
  return device.deviceType === 'simulator' || device.deviceType === 'emulator';
}
