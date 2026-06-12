import { safeIdOfAppAsync } from '@expo/osascript';
import semver from 'semver';

import * as xcode from './xcode';

export type SimulatorAppInfo = {
  /** App name as registered in Launch Services, also the macOS process name (e.g. 'Simulator', 'DeviceHub'). */
  name: string;
  bundleId: string;
};

export const SIMULATOR_APP_NAME = 'Simulator';
/** Xcode 27 replaced Simulator.app with DeviceHub.app (Xcode.app/Contents/Applications/DeviceHub.app). */
export const DEVICE_HUB_APP_NAME = 'DeviceHub';

export const KNOWN_SIMULATOR_APP_IDS = [
  'com.apple.iphonesimulator',
  'com.apple.CoreSimulator.SimulatorTrampoline',
  // DeviceHub.app, Xcode 27+
  'com.apple.dt.Devices',
];

const FIRST_DEVICE_HUB_XCODE_VERSION = '27.0.0';

let cachedSimulatorAppInfo: SimulatorAppInfo | null | undefined;

async function resolveAppInfoAsync(name: string): Promise<SimulatorAppInfo | null> {
  const bundleId = await safeIdOfAppAsync(name);
  return bundleId ? { name, bundleId } : null;
}

/**
 * Resolves which simulator UI app is registered with Launch Services. Xcode 27+
 * ships DeviceHub.app instead of Simulator.app, so on those toolchains DeviceHub
 * is preferred. The other app is still considered as a fallback so machines with
 * multiple Xcodes installed continue to work.
 */
export async function getSimulatorAppInfoAsync(): Promise<SimulatorAppInfo | null> {
  if (cachedSimulatorAppInfo === undefined) {
    const [xcodeVersion, simulatorInfo, deviceHubInfo] = await Promise.all([
      xcode.getXcodeVersionAsync(),
      resolveAppInfoAsync(SIMULATOR_APP_NAME),
      resolveAppInfoAsync(DEVICE_HUB_APP_NAME),
    ]);

    const preferDeviceHub =
      !!xcodeVersion && semver.gte(xcodeVersion, FIRST_DEVICE_HUB_XCODE_VERSION);
    cachedSimulatorAppInfo = preferDeviceHub
      ? (deviceHubInfo ?? simulatorInfo)
      : (simulatorInfo ?? deviceHubInfo);
  }

  return cachedSimulatorAppInfo;
}

export async function getSimulatorAppNameAsync(): Promise<string> {
  return (await getSimulatorAppInfoAsync())?.name ?? SIMULATOR_APP_NAME;
}
