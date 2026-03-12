import { extractAppFromLocalArchiveAsync, detectAppleAppType } from 'eas-shared';

export async function detectAppleAppTypeAsync(appPath: string) {
  if (!appPath.endsWith('.app') && !appPath.endsWith('.ipa')) {
    appPath = await extractAppFromLocalArchiveAsync(appPath);
  }

  const appInfo = await detectAppleAppType(appPath);

  return appInfo;
}
