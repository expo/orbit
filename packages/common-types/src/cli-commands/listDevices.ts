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

export type DevicesPerPlatform = {
  [P in Exclude<Platform, Platform.All>]: {
    devices: Device<P>[];
    error?: { code: string; message: string };
  };
};
