import {
  AndroidConnectedDevice,
  AndroidEmulator,
  AppleConnectedDevice,
  IosSimulator,
} from "../devices";
import { Platform } from "./index";

type Device<P> = P extends Platform.Ios
  ? IosSimulator | AppleConnectedDevice
  : P extends Platform.Android
  ? AndroidConnectedDevice | AndroidEmulator
  : never;

export type DevicesPerPlatform = {
  [P in Exclude<Platform, Platform.All>]: {
    devices: Array<Device<P>>;
    error?: string;
  };
};
