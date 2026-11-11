import { CliCommands } from 'common-types';
import {
  Device,
  IosSimulator,
  AndroidEmulator,
  AppleConnectedDevice,
  TVosSimulator,
  WatchosSimulator,
  AndroidConnectedDevice,
  RemoteSimulator,
} from 'common-types/build/devices';
import { SectionListData } from 'react-native';

export type DevicesPerPlatform = {
  [P in Exclude<CliCommands.Platform, CliCommands.Platform.All>]: {
    devices: Map<string, CliCommands.ListDevices.Device<P>>;
    error?: CliCommands.ListDevices.DeviceListError;
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
  if (device.deviceType === 'remote') {
    return device.id;
  }
  return device.osType === 'iOS' || device.osType === 'tvOS' || device.osType === 'watchOS'
    ? device.udid
    : device.name;
}

export function getSectionsFromDeviceList(
  devicesPerPlatform: DevicesPerPlatform,
  { alwaysShowAndroid = false }: { alwaysShowAndroid?: boolean } = {}
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

  // Keep the Android section visible even with no devices/errors when Android is
  // enabled, so the header's "+" stays available for pairing a device over Wi-Fi.
  return sections.filter(
    (section) =>
      section.data.length > 0 || section.error || (section.key === 'android' && alwaysShowAndroid)
  );
}

/** An Expo Simulators row (a remote device). The local boot, install and device-selection code never handles one. */
export function isRemoteDevice(device: Device): device is RemoteSimulator {
  return device.deviceType === 'remote';
}

/**
 * Whether `uri` is a build that an Expo Simulators session can download and install: a hosted iOS
 * simulator tarball or Android APK. Returns its platform. Reads only the pathname, because
 * signed URLs carry a query string.
 */
export function getRemoteArchivePlatform(uri: string): 'ios' | 'android' | undefined {
  if (!uri.startsWith('https://')) {
    return undefined;
  }
  let pathname: string;
  try {
    pathname = new URL(uri).pathname.toLowerCase();
  } catch {
    return undefined;
  }
  if (pathname.endsWith('.apk')) {
    return 'android';
  }
  return pathname.endsWith('.tar.gz') || pathname.endsWith('.tgz') ? 'ios' : undefined;
}

export function isVirtualDevice(
  device: Device
): device is IosSimulator | TVosSimulator | WatchosSimulator | AndroidEmulator {
  return device.deviceType === 'simulator' || device.deviceType === 'emulator';
}

/**
 * The order of a section: physical devices, then running virtual devices, then the other
 * virtual devices from the most recent boot to the oldest. Devices with equal rank keep
 * their order, so Android emulators, which report no boot time, stay as listed.
 */
export function sortDevicesByRecentUse(devices: Device[]): Device[] {
  const rank = (device: Device) =>
    !isVirtualDevice(device) ? 0 : device.state === 'Booted' ? 1 : 2;
  const lastBootedAt = (device: Device) => ('lastBootedAt' in device && device.lastBootedAt) || 0;
  return [...devices].sort(
    (a, b) => rank(a) - rank(b) || (rank(a) === 2 ? lastBootedAt(b) - lastBootedAt(a) : 0)
  );
}

/**
 * The devices of a section in the order that the user gave them. Devices that are not in
 * `order` come after, by recent use. With no order, all devices are by recent use.
 */
export function orderDevices(devices: Device[], order?: string[]): Device[] {
  const sorted = sortDevicesByRecentUse(devices);
  if (!order?.length) {
    return sorted;
  }
  const position = (device: Device) => {
    const index = order.indexOf(getDeviceId(device));
    return index < 0 ? order.length : index;
  };
  return sorted.sort((a, b) => position(a) - position(b));
}

/** `items` with the item at `from` moved to `to`. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/**
 * The devices a section shows before the user asks for all of them: every physical device,
 * every running virtual device and the selected one, then the virtual devices booted most
 * recently, up to `limit` virtual devices. The order of `devices` is kept.
 */
export function getCollapsedDevices(
  devices: Device[],
  selectedId?: string,
  limit = 3,
  // The user gave the section an order: the first devices of that order show.
  keepOrder = false
): Device[] {
  const isPinned = (device: Device) =>
    !isVirtualDevice(device) || device.state === 'Booted' || getDeviceId(device) === selectedId;
  const pinned = devices.filter(isPinned);
  const unpinned = devices.filter((device) => !isPinned(device));
  const rest = keepOrder
    ? unpinned
    : unpinned.sort(
        (a, b) =>
          (('lastBootedAt' in b && b.lastBootedAt) || 0) -
          (('lastBootedAt' in a && a.lastBootedAt) || 0)
      );
  const pinnedVirtual = pinned.filter(isVirtualDevice).length;
  const shown = new Set([...pinned, ...rest.slice(0, Math.max(0, limit - pinnedVirtual))]);
  // A "show 1 more" row would take the place of the one row it hides.
  return devices.length - shown.size <= 1 ? devices : devices.filter((device) => shown.has(device));
}
