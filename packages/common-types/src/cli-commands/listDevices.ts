import {
  AndroidConnectedDevice,
  AndroidEmulator,
  AppleConnectedDevice,
  IosSimulator,
} from '../devices';
import { Platform } from './platform';

export type Device<P> = P extends Platform.Ios
  ? IosSimulator | AppleConnectedDevice
  : P extends Platform.Android
    ? AndroidConnectedDevice | AndroidEmulator
    : never;

export type DevicesPerPlatform = {
  [P in Exclude<Platform, Platform.All>]: {
    devices: Device<P>[];
    error?: { code: string; message: string };
  };
};
