import { CliCommands } from 'common-types';
import {
  Device,
  IosSimulator,
  AndroidEmulator,
  AppleConnectedDevice,
  TVosSimulator,
  WatchosSimulator,
  AndroidConnectedDevice,
} from 'common-types/build/devices';
import { SectionListData } from 'react-native';

export type DevicesPerPlatform = {
  [P in Exclude<CliCommands.Platform, CliCommands.Platform.All>]: {
    devices: Map<string, CliCommands.ListDevices.Device<P>>;
    error?: { code: string; message: string };
  };
};

export type DevicePlatform = 'android' | 'ios' | 'tvos' | 'watchos';

type DeviceToPlatform<T extends Device> = T extends IosSimulator | AppleConnectedDevice
  ? 'ios'
  : T extends TVosSimulator
    ? 'tvos'
    : T extends WatchosSimulator
      ? 'watchos'
      : T extends AndroidEmulator | AndroidConnectedDevice
        ? 'android'
        : DevicePlatform;

export type PlatformToDevice<P extends DevicePlatform> = P extends 'ios'
  ? IosSimulator | AppleConnectedDevice
  : P extends 'tvos'
    ? TVosSimulator
    : P extends 'watchos'
      ? WatchosSimulator
      : P extends 'android'
        ? AndroidEmulator | AndroidConnectedDevice
        : Device;

export function getDeviceOS<T extends Device>(device: T): DeviceToPlatform<T> {
  return device.osType.toLowerCase() as DeviceToPlatform<T>;
}

export function getDeviceId(device: Device): string {
  return device.osType === 'iOS' || device.osType === 'tvOS' || device.osType === 'watchOS'
    ? device.udid
    : device.name;
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
    {
      data: Array.from(devicesPerPlatform.tvos.devices.values()),
      key: 'tvos',
      label: 'tvOS',
      error: devicesPerPlatform.tvos.error,
    },
    {
      data: Array.from(devicesPerPlatform.watchos.devices.values()),
      key: 'watchos',
      label: 'watchOS',
      error: devicesPerPlatform.watchos.error,
    },
  ];

  return sections.filter((section) => section.data.length > 0 || section.error);
}

export function isVirtualDevice(
  device: Device
): device is IosSimulator | TVosSimulator | WatchosSimulator | AndroidEmulator {
  return device.deviceType === 'simulator' || device.deviceType === 'emulator';
}
