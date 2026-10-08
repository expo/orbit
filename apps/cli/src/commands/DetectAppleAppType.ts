import { CliCommands } from 'common-types';
import { extractAppFromLocalArchiveAsync, detectAppleAppType } from 'eas-shared';

export async function detectAppleAppTypeAsync(
  appPath: string
): Promise<CliCommands.DetectAppleAppType.AppleAppInfo> {
  // Only a .app bundle can be inspected in place; archives (.ipa, .tar.gz) must
  // be extracted first, as install-and-launch does. Treating .ipa as inspectable
  // looked for Info.plist at the zip's path, found nothing, and returned the
  // bare "device / iOS" default — with no provisioning profile.
  if (!appPath.endsWith('.app')) {
    appPath = await extractAppFromLocalArchiveAsync(appPath);
  }

  return detectAppleAppType(appPath);
}
