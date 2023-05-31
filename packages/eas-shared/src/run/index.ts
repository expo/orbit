import * as Emulator from "./android/emulator";
import * as Simulator from "./ios/simulator";
import { validateSystemRequirementsAsync } from "./ios/systemRequirements";
import { assertExecutablesExistAsync } from "./android/systemRequirements";
import { getAptParametersAsync } from "./android/aapt";

export async function runAppOnIosSimulatorAsync(
  appPath: string,
  simulator: Simulator.IosSimulator
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
  emulator: Emulator.AndroidEmulator
): Promise<void> {
  await assertExecutablesExistAsync();
  const bootedEmulator = await Emulator.ensureEmulatorBootedAsync(emulator);
  await Emulator.installAppAsync(bootedEmulator, appPath);
  const { packageName, activityName } = await getAptParametersAsync(appPath);
  await Emulator.startAppAsync(bootedEmulator, packageName, activityName);
}
