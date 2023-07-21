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

export type IOSDevice = BaseDevice & {
  osType: 'iOS';
  udid: string;
  deviceType: 'simulator' | 'device';
};

export type AndroidDevice = BaseDevice & {
  osType: 'android';
  pid?: number;
  deviceType: 'emulator' | 'device';
};

export type Device = AndroidDevice | IOSDevice;

export function getDeviceOS(device: Device): 'android' | 'ios' {
  return device.osType.toLowerCase() as 'android' | 'ios';
}

export function getDeviceId(device: Device): string {
  return device.osType === 'iOS' ? device.udid : device.name;
}
