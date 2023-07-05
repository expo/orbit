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

export function getDeviceOS(device: Device): 'android' | 'ios' {
  return device.osType.toLowerCase() as 'android' | 'ios';
}
