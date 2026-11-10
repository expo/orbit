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
}

/**
 * An Expo Simulators device: a simulator or emulator that runs on EAS, not on this machine.
 * `eas:ios` and `eas:android` are the rows that start a new session; `eas:<sessionId>`
 * is a session. Carries no URL or token: the CLI reads those when it needs them.
 */
export interface RemoteSimulator {
  id: string;
  name: string;
  osType: 'iOS' | 'Android';
  deviceType: 'remote';
  state: 'Shutdown' | 'Starting' | 'Booted';
  /** Sessions only: the session has a controller that Orbit can install builds through. */
  installable?: boolean;
  /** Sessions only: the account and project the session runs under. */
  accountName?: string;
  projectSlug?: string;
  /** Sessions only: the device model, for example `iPhone 18 Pro` or `pixel_9`. */
  deviceIdentifier?: string;
}

export const REMOTE_SIMULATOR_ID_PREFIX = 'eas:';

export type RemoteSimulatorOption = { id: string; label: string; createdAt?: string };

/** The choices of the "Create new simulator" window, for one project. */
export type RemoteSimulatorOptions = {
  devices: { ios: RemoteSimulatorOption[]; android: RemoteSimulatorOption[] };
  builds: { ios: RemoteSimulatorOption[]; android: RemoteSimulatorOption[] };
  expoGoSdkVersions: RemoteSimulatorOption[];
};

export type RemoteSimulatorAccount = { id: string; name: string };

export type RemoteSimulatorList = {
  devices: RemoteSimulator[];
  /** Accounts of the signed-in user that have access to Expo Simulators. */
  accounts: RemoteSimulatorAccount[];
};

export type Device =
  | AppleConnectedDevice
  | IosSimulator
  | TVosSimulator
  | WatchosSimulator
  | AndroidEmulator
  | AndroidConnectedDevice
  | RemoteSimulator;
