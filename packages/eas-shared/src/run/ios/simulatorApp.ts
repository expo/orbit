import * as osascript from '@expo/osascript';
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
  try {
    const bundleId = (await osascript.execAsync(`id of app "${name}"`)).trim();
    return bundleId ? { name, bundleId } : null;
  } catch {
    return null;
  }
}

/**
 * Resolves which simulator UI app is available on this machine.
 *
 * When the selected Xcode is 27 or newer, DeviceHub.app is preferred since
 * Simulator.app no longer ships with Xcode. Older Xcode versions resolve to
 * Simulator.app first, so machines with multiple Xcodes installed keep using
 * the app that matches the active toolchain.
 */
export async function getSimulatorAppInfoAsync(): Promise<SimulatorAppInfo | null> {
  if (cachedSimulatorAppInfo === undefined) {
    const xcodeVersion = await xcode.getXcodeVersionAsync();
    const candidates =
      xcodeVersion && semver.gte(xcodeVersion, FIRST_DEVICE_HUB_XCODE_VERSION)
        ? [DEVICE_HUB_APP_NAME, SIMULATOR_APP_NAME]
        : [SIMULATOR_APP_NAME, DEVICE_HUB_APP_NAME];

    cachedSimulatorAppInfo = null;
    for (const name of candidates) {
      const info = await resolveAppInfoAsync(name);
      if (info) {
        cachedSimulatorAppInfo = info;
        break;
      }
    }
  }

  return cachedSimulatorAppInfo;
}

export async function getSimulatorAppNameAsync(): Promise<string> {
  return (await getSimulatorAppInfoAsync())?.name ?? SIMULATOR_APP_NAME;
}
