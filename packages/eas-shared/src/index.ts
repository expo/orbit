import {
  downloadAndMaybeExtractAppAsync,
  AppPlatform,
  extractAppFromLocalArchiveAsync,
} from "./download";
import { runAppOnIosSimulatorAsync, runAppOnAndroidEmulatorAsync } from "./run";
import * as Simulator from "./run/ios/simulator";
import * as Emulator from "./run/android/emulator";
import { validateSystemRequirementsAsync as validateIOSSystemRequirementsAsync } from "./run/ios/systemRequirements";
import { assertExecutablesExistAsync as validateAndroidSystemRequirementsAsync } from "./run/android/systemRequirements";

export {
  AppPlatform,
  downloadAndMaybeExtractAppAsync,
  extractAppFromLocalArchiveAsync,
  runAppOnIosSimulatorAsync,
  runAppOnAndroidEmulatorAsync,
  validateAndroidSystemRequirementsAsync,
  validateIOSSystemRequirementsAsync,
  Emulator,
  Simulator,
};
