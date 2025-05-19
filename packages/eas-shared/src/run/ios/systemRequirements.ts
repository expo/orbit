import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { InternalError } from 'common-types';
import semver from 'semver';

import { getSimulatorAppIdAsync } from './simulator';
import * as xcode from './xcode';
import { isXcrunInstalledAsync } from './xcrun';
import Log from '../../log';

function assertPlatform(): void {
  if (process.platform !== 'darwin') {
    Log.error('iOS simulator apps can only be run on macOS devices.');
    throw Error('iOS simulator apps can only be run on macOS devices.');
  }
}

async function assertCorrectXcodeVersionInstalledAsync(): Promise<void> {
  const xcodeVersion = await xcode.getXcodeVersionAsync();

  if (!xcodeVersion) {
    throw new InternalError('XCODE_NOT_INSTALLED', 'Xcode is not installed.');
  }

  if (semver.lt(xcodeVersion, xcode.MIN_XCODE_VERSION)) {
    throw Error(
      `Xcode version ${chalk.bold(xcodeVersion)} is too old. Please upgrade to version ${chalk.bold(
        xcode.MIN_XCODE_VERSION
      )} or higher.`
    );
  }
}

async function ensureXcrunInstalledAsync(): Promise<void> {
  if (!isXcrunInstalledAsync()) {
    throw new InternalError(
      'XCODE_COMMAND_LINE_TOOLS_NOT_INSTALLED',
      'Please try again once Xcode Command Line Tools are installed'
    );
  }
}

async function assertSimulatorAppInstalledAsync(): Promise<void> {
  const simulatorAppId = await getSimulatorAppIdAsync();
  if (!simulatorAppId) {
    throw new InternalError(
      'TOOL_CHECK_FAILED',
      `Can't determine id of Simulator app; the Simulator is most likely not installed on this machine. Run 'sudo xcode-select -s /Applications/Xcode.app'`,
      { command: 'sudo xcode-select -s /Applications/Xcode.app' }
    );
  }

  if (
    simulatorAppId !== 'com.apple.iphonesimulator' &&
    simulatorAppId !== 'com.apple.CoreSimulator.SimulatorTrampoline'
  ) {
    throw new Error(
      `Simulator is installed but is identified as '${simulatorAppId}', can't recognize what that is`
    );
  }

  try {
    // make sure we can run simctl
    await spawnAsync('xcrun', ['simctl', 'help']);
  } catch (error: any) {
    Log.warn(`Unable to run simctl:\n${error.toString()}`);
    throw new InternalError(
      'TOOL_CHECK_FAILED',
      'xcrun is not configured correctly. Ensure `sudo xcode-select --reset` works before running this command again.',
      {
        command: 'sudo xcode-select --reset',
      }
    );
  }
}

export async function validateSystemRequirementsAsync(): Promise<void> {
  assertPlatform();
  await assertCorrectXcodeVersionInstalledAsync();
  await ensureXcrunInstalledAsync();
  await assertSimulatorAppInstalledAsync();
}
