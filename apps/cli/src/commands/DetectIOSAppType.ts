import { extractAppFromLocalArchiveAsync, detectIOSAppType } from 'eas-shared';

export async function detectIOSAppTypeAsync(appPath: string) {
  if (!appPath.endsWith('.app') && !appPath.endsWith('.ipa')) {
    appPath = await extractAppFromLocalArchiveAsync(appPath);
  }

  const appType = await detectIOSAppType(appPath);

  return appType;
}
