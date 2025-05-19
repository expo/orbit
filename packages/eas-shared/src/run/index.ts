import { AndroidEmulator, IosSimulator } from 'common-types/build/devices';

import { getAptParametersAsync } from './android/aapt';
import * as Emulator from './android/emulator';
import { assertExecutablesExistAsync } from './android/systemRequirements';
import * as Simulator from './ios/simulator';
import { validateSystemRequirementsAsync } from './ios/systemRequirements';
export { detectIOSAppType } from './ios/inspectApp';

export async function runAppOnIosSimulatorAsync(
  appPath: string,
  simulator: IosSimulator
): Promise<void> {
  await validateSystemRequirementsAsync();

  await Simulator.ensureSimulatorBootedAsync(simulator);

  await Simulator.ensureSimulatorAppOpenedAsync(simulator.udid);

  const bundleIdentifier = await Simulator.getAppBundleIdentifierAsync(appPath);
  await Simulator.installAppAsync(simulator.udid, appPath);

  await Simulator.launchAppAsync(simulator.udid, bundleIdentifier);
}

export async function runAppOnAndroidEmulatorAsync(
  appPath: string,
  emulator: AndroidEmulator
): Promise<void> {
  await assertExecutablesExistAsync();
  const bootedEmulator = await Emulator.ensureEmulatorBootedAsync(emulator);
  await Emulator.activateEmulatorWindowAsync(bootedEmulator);
  await Emulator.installAppAsync(bootedEmulator, appPath);
  const { packageName, activityName } = await getAptParametersAsync(appPath);
  await Emulator.startAppAsync(bootedEmulator, packageName, activityName);
}
