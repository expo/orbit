import {
  AndroidConnectedDevice,
  AndroidEmulator,
  AppleConnectedDevice,
  IosSimulator,
  TVosSimulator,
  WatchosSimulator,
} from '../devices';
import { Platform } from './platform';

export type Device<P> = P extends Platform.Ios
  ? IosSimulator | AppleConnectedDevice
  : P extends Platform.Tvos
    ? TVosSimulator
    : P extends Platform.Watchos
      ? WatchosSimulator
      : P extends Platform.Android
        ? AndroidConnectedDevice | AndroidEmulator
        : never;

export type DeviceListErrorHelper = {
  /** Short, human-readable name of the helper software to install. */
  label: string;
  /** URL to open so the user can install the helper software. */
  installUrl?: string;
  /** Shell command that installs the helper software. */
  installCommand?: string;
};

export type DeviceListError = {
  code: string;
  message: string;
  /** Present when the error is actionable by installing helper software. */
  helper?: DeviceListErrorHelper;
};

export type DevicesPerPlatform = {
  [P in Exclude<Platform, Platform.All>]: {
    devices: Device<P>[];
    error?: DeviceListError;
  };
};
