import { CliCommands } from 'common-types';
import { extractAppFromLocalArchiveAsync, detectAppleAppType } from 'eas-shared';

export async function detectAppleAppTypeAsync(
  appPath: string
): Promise<CliCommands.DetectAppleAppType.AppleAppInfo> {
  if (!appPath.endsWith('.app') && !appPath.endsWith('.ipa')) {
    appPath = await extractAppFromLocalArchiveAsync(appPath);
  }

  return detectAppleAppType(appPath);
}
