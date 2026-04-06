export interface AppleConnectedDevice {
  /** @example `00008101-001964A22629003A` */
  udid: string;
  /** @example `Evan's phone` */
  name: string;
  /** @example `iPhone13,4` */
  model: string;
  /** @example `device` */
  deviceType: 'device' | 'catalyst';
  /** @example `USB` */
  connectionType: 'USB' | 'Network';
  /** @example `15.4.1` */
  osVersion: string;
  osType: 'iOS';
  developerModeStatus?: 'enabled' | 'disabled';
}

export interface AppleSimulator {
  runtime: string;
  osVersion: string;
  windowName: string;
  state: 'Booted' | 'Shutdown';
  isAvailable: boolean;
  name: string;
  udid: string;
  lastBootedAt?: number;
  deviceType: 'simulator';
}

export interface IosSimulator extends AppleSimulator {
  osType: 'iOS';
}

export interface TVosSimulator extends AppleSimulator {
  osType: 'tvOS';
}

export interface WatchosSimulator extends AppleSimulator {
  osType: 'watchOS';
}

export interface AndroidEmulator {
  pid?: string;
  name: string;
  osType: 'Android';
  deviceType: 'emulator';
  state: 'Booted' | 'Shutdown';
}

export interface AndroidConnectedDevice {
  pid: string;
  model: string;
  name: string;
  osType: 'Android';
  deviceType: 'device';
  connectionType?: 'USB' | 'Network';
  authorized?: boolean;
}

export type Device =
  | AppleConnectedDevice
  | IosSimulator
  | TVosSimulator
  | WatchosSimulator
  | AndroidEmulator
  | AndroidConnectedDevice;
