import {
  validateAndroidSystemRequirementsAsync,
  validateIOSSystemRequirementsAsync,
} from 'eas-shared';
import stripAnsi from 'strip-ansi';

type CheckToolsOptions = {
  platform: 'android' | 'ios' | 'all';
};

type PlatformToolsResult = {
  success: boolean;
  reason?: string;
};

export async function checkToolsAsync({ platform = 'all' }: CheckToolsOptions) {
  const result: { android?: PlatformToolsResult; ios?: PlatformToolsResult } = {};

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
      }
      resolve(null);
    }),
  ]);

  return result;
}

async function checkAndroidToolsAsync(): Promise<PlatformToolsResult> {
  try {
    await validateAndroidSystemRequirementsAsync();
    return { success: true };
  } catch (error: any) {
    return { reason: stripAnsi(error.message), success: false };
  }
}

async function checkIosToolsAsync(): Promise<PlatformToolsResult> {
  try {
    await validateIOSSystemRequirementsAsync();
    return { success: true };
  } catch (error: any) {
    return { reason: stripAnsi(error.message), success: false };
  }
}
