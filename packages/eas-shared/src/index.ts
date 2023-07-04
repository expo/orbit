import {
  downloadAndMaybeExtractAppAsync,
  AppPlatform,
  extractAppFromLocalArchiveAsync,
} from "./download";
import { runAppOnIosSimulatorAsync, runAppOnAndroidEmulatorAsync } from "./run";
import * as Simulator from "./run/ios/simulator";
import * as Emulator from "./run/android/emulator";

export {
  AppPlatform,
  downloadAndMaybeExtractAppAsync,
  extractAppFromLocalArchiveAsync,
  runAppOnIosSimulatorAsync,
  runAppOnAndroidEmulatorAsync,
  Emulator,
  Simulator,
};
