import spawnAsync, { SpawnResult } from "@expo/spawn-async";
import assert from "assert";
import chalk from "chalk";
import os from "os";
import path from "path";

import Log from "../../log";
import { promptAsync } from "../../prompts";
import {
  AndroidDevice,
  adbAsync,
  getFirstRunningEmulatorAsync,
  isEmulatorBootedAsync,
  waitForEmulatorToBeBootedAsync,
} from "./adb";
import { getAndroidSdkRootAsync } from "./sdk";

export const EMULATOR_MAX_WAIT_TIMEOUT_MS = 60 * 1000 * 3;
export { AndroidDevice, getRunningDevicesAsync } from "./adb";
export { getAptParametersAsync } from "./aapt";

export async function getEmulatorExecutableAsync(): Promise<string> {
  const sdkRoot = await getAndroidSdkRootAsync();
  if (sdkRoot) {
    return path.join(sdkRoot, "emulator", "emulator");
  }

  return "emulator";
}

async function emulatorAsync(...options: string[]): Promise<SpawnResult> {
  const emulatorExecutable = await getEmulatorExecutableAsync();
  try {
    return await spawnAsync(emulatorExecutable, options);
  } catch (error: any) {
    if (error.stderr) {
      Log.error(error.stderr);
    }
    throw error;
  }
}

export async function getAvailableAndroidEmulatorsAsync(): Promise<
  AndroidDevice[]
> {
  try {
    const { stdout } = await emulatorAsync("-list-avds");

    return stdout
      .split(os.EOL)
      .filter(Boolean)
      .map((name) => ({
        name,
        osType: "android",
        type: "emulator",
      }));
  } catch {
    return [];
  }
}

/** Start an Android device and wait until it is booted. */
export async function bootEmulatorAsync(
  emulator: AndroidDevice,
  {
    timeout = EMULATOR_MAX_WAIT_TIMEOUT_MS,
    interval = 1000,
    noAudio = false,
  }: {
    /** Time in milliseconds to wait before asserting a timeout error. */
    timeout?: number;
    interval?: number;
    noAudio?: boolean;
  } = {}
): Promise<AndroidDevice> {
  Log.newLine();
  Log.log(`Opening emulator ${chalk.bold(emulator.name)}`);

  const emulatorExecutable = await getEmulatorExecutableAsync();
  const spawnArgs = [`@${emulator.name}`];
  if (noAudio) {
    spawnArgs.push("-no-audio");
  }

  // Start a process to open an emulator
  const emulatorProcess = spawnAsync(emulatorExecutable, spawnArgs, {
    stdio: "ignore",
    detached: true,
  });

  // we don't want to wait for the emulator process to exit before we can finish `eas build:run` command
  // https://github.com/expo/eas-cli/pull/1485#discussion_r1007935871
  emulatorProcess.child.unref();

  return await waitForEmulatorToBeBootedAsync(timeout, interval);
}

export async function selectEmulatorAsync(): Promise<AndroidDevice> {
  const runningEmulator = await getFirstRunningEmulatorAsync();

  if (runningEmulator) {
    Log.newLine();
    Log.log(`Using open emulator: ${chalk.bold(runningEmulator.name)}`);

    return runningEmulator;
  }

  const emulators = await getAvailableAndroidEmulatorsAsync();

  Log.newLine();
  const { selectedEmulator } = await promptAsync({
    type: "select",
    message: `Select an emulator to run your app on`,
    name: "selectedEmulator",
    choices: emulators.map((emulator) => ({
      title: emulator.name,
      value: emulator,
    })),
  });

  return selectedEmulator;
}

export async function ensureEmulatorBootedAsync(
  emulator: AndroidDevice
): Promise<AndroidDevice> {
  if (!emulator.pid || !(await isEmulatorBootedAsync(emulator.pid))) {
    return await bootEmulatorAsync(emulator);
  }

  return emulator;
}

export async function installAppAsync(
  emulator: AndroidDevice,
  apkFilePath: string
): Promise<void> {
  Log.newLine();
  Log.log("Installing your app...");

  assert(emulator.pid);
  await adbAsync("-s", emulator.pid, "install", "-r", "-d", apkFilePath);

  Log.succeed("Successfully installed your app!");
}

export async function startAppAsync(
  emulator: AndroidDevice,
  packageName: string,
  activityName: string
): Promise<void> {
  Log.newLine();
  Log.log("Starting your app...");

  assert(emulator.pid);
  await adbAsync(
    "-s",
    emulator.pid,
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.MAIN",
    "-f",
    "0x20000000", // FLAG_ACTIVITY_SINGLE_TOP -- If set, the activity will not be launched if it is already running at the top of the history stack.
    "-n",
    `${packageName}/${activityName}`
  );

  Log.succeed("Successfully started your app!");
}
