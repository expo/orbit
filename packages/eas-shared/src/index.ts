import {
  downloadAndMaybeExtractAppAsync,
  AppPlatform,
  extractAppFromLocalArchiveAsync,
} from './download';
import * as Env from './env';
import * as ManifestUtils from './manifest';
import { Manifest } from './manifest';
import { runAppOnIosSimulatorAsync, runAppOnAndroidEmulatorAsync, detectAppleAppType } from './run';
import * as Emulator from './run/android/emulator';
import { assertExecutablesExistAsync as validateAndroidSystemRequirementsAsync } from './run/android/systemRequirements';
import AppleDevice from './run/ios/device';
import * as Simulator from './run/ios/simulator';
import { validateSystemRequirementsAsync as validateIOSSystemRequirementsAsync } from './run/ios/systemRequirements';

export {
  AppPlatform,
  downloadAndMaybeExtractAppAsync,
  extractAppFromLocalArchiveAsync,
  runAppOnIosSimulatorAsync,
  runAppOnAndroidEmulatorAsync,
  validateAndroidSystemRequirementsAsync,
  validateIOSSystemRequirementsAsync,
  detectAppleAppType,
  Emulator,
  Simulator,
  AppleDevice,
  Env,
  ManifestUtils,
  Manifest,
};
