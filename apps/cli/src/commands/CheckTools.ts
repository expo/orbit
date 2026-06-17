import { InternalError } from 'common-types';
import { FailureReason, PlatformToolsCheck } from 'common-types/build/cli-commands/checkTools';
import {
  AppleDevice,
  validateAndroidSystemRequirementsAsync,
  validateAppleDeviceRequirementsAsync,
  validateIOSSystemRequirementsAsync,
} from 'eas-shared';
import stripAnsi from 'strip-ansi';

type CheckToolsOptions = {
  platform: 'android' | 'ios' | 'all';
};

export async function checkToolsAsync({ platform = 'all' }: CheckToolsOptions) {
  const result: PlatformToolsCheck = {};

  await Promise.allSettled([
    new Promise(async (resolve) => {
      if (platform === 'android' || platform === 'all') {
        result.android = await checkAndroidToolsAsync();
      }
      resolve(null);
    }),
    new Promise(async (resolve) => {
      if (platform === 'ios' || platform === 'all') {
        result.ios = await checkIosToolsAsync();
        // usbmuxd ships with macOS and is the default on Linux (socket-activated,
        // starts when a device is plugged in). Only Windows needs Apple Mobile
        // Device Support installed explicitly, so only surface the check there.
        if (process.platform === 'win32') {
          result.appleDevice = await checkAppleDeviceToolsAsync();
        }
      }
      resolve(null);
    }),
  ]);

  return result;
}

async function checkAndroidToolsAsync(): Promise<PlatformToolsCheck['android']> {
  try {
    await validateAndroidSystemRequirementsAsync();
    return { success: true };
  } catch (error: any) {
    const reason: FailureReason = { message: stripAnsi(error.message) };
    if (error instanceof InternalError && typeof error?.details?.command === 'string') {
      reason.command = error.details.command;
    }

    return { reason, success: false };
  }
}

async function checkIosToolsAsync(): Promise<PlatformToolsCheck['ios']> {
  try {
    await validateIOSSystemRequirementsAsync();
    return { success: true };
  } catch (error: any) {
    const reason: FailureReason = { message: stripAnsi(error.message) };
    if (error instanceof InternalError && typeof error?.details?.command === 'string') {
      reason.command = error.details.command;
    }

    return { reason, success: false };
  }
}

async function checkAppleDeviceToolsAsync(): Promise<PlatformToolsCheck['appleDevice']> {
  try {
    await validateAppleDeviceRequirementsAsync();
    return { success: true };
  } catch (error: any) {
    const { description: _description, ...helper } = AppleDevice.getUsbmuxdHelperGuidance();
    const reason: FailureReason = {
      message: stripAnsi(error.message),
      // Surface the install command so the onboarding's "Copy command" affordance works.
      command: helper.installCommand,
    };
    return { reason, helper, success: false };
  }
}
