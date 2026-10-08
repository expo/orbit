import { CliCommands } from 'common-types';
import fs from 'fs-extra';
import path from 'path';

import { parseBinaryPlistAsync, parsePlistBuffer } from '../../utils/parseBinaryPlistAsync';

export type AppleAppInfo = CliCommands.DetectAppleAppType.AppleAppInfo;
export type EmbeddedProvisioning = NonNullable<AppleAppInfo['provisioning']>;

const PLIST_START = Buffer.from('<?xml');
const PLIST_END = Buffer.from('</plist>');

type RawProfile = {
  Name?: string;
  TeamIdentifier?: string[];
  ExpirationDate?: Date | string;
  ProvisionsAllDevices?: boolean;
  ProvisionedDevices?: string[];
  Entitlements?: Record<string, unknown>;
};

/**
 * Read the app's `embedded.mobileprovision`. The profile is a CMS (PKCS#7)
 * blob whose signed content is the XML plist, inline — so slicing the
 * `<?xml … </plist>` span out of the DER bytes yields it on every platform
 * without a CMS parser. The signature is not verified: this is a hint about
 * whether an install can succeed, and iOS re-verifies everything on install.
 * Returns undefined when there is no profile (simulator or unsigned builds).
 */
export async function readEmbeddedProvisioningProfileAsync(
  appPath: string
): Promise<EmbeddedProvisioning | undefined> {
  const file = path.join(appPath, 'embedded.mobileprovision');
  if (!fs.existsSync(file)) return undefined;
  const blob = await fs.promises.readFile(file);
  const start = blob.indexOf(PLIST_START);
  const end = start === -1 ? -1 : blob.indexOf(PLIST_END, start);
  if (start === -1 || end === -1) return undefined;
  const profile = parsePlistBuffer(blob.subarray(start, end + PLIST_END.length)) as RawProfile;

  const expiresAt =
    profile.ExpirationDate instanceof Date
      ? profile.ExpirationDate
      : new Date(profile.ExpirationDate ?? NaN);
  const provisionedDevices = Array.isArray(profile.ProvisionedDevices)
    ? profile.ProvisionedDevices
    : undefined;
  const provisionsAllDevices = profile.ProvisionsAllDevices === true;
  const entitlements = profile.Entitlements ?? {};
  // Same tells Xcode uses: enterprise profiles cover every device, development
  // ones carry get-task-allow, ad hoc ones list devices, App Store/TestFlight
  // ones list none — and those can never be sideloaded.
  const kind: EmbeddedProvisioning['kind'] = provisionsAllDevices
    ? 'enterprise'
    : entitlements['get-task-allow'] === true
      ? 'development'
      : provisionedDevices
        ? 'ad-hoc'
        : 'app-store';

  return {
    name: profile.Name,
    teamId: profile.TeamIdentifier?.[0],
    expiresAt: Number.isNaN(expiresAt.getTime()) ? undefined : expiresAt.toISOString(),
    provisionsAllDevices,
    provisionedDevices,
    kind,
  };
}

export async function detectAppleAppType(appPath: string): Promise<AppleAppInfo> {
  // iOS/tvOS/watchOS apps have Info.plist at the root, macOS apps nest it under Contents/
  let builtInfoPlistPath = path.join(appPath, 'Info.plist');
  if (!fs.existsSync(builtInfoPlistPath)) {
    builtInfoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
  }
  if (!fs.existsSync(builtInfoPlistPath)) {
    return { deviceType: 'device', osType: 'iOS' };
  }

  const { DTPlatformName }: { DTPlatformName: string } =
    await parseBinaryPlistAsync(builtInfoPlistPath);

  const deviceType: AppleAppInfo['deviceType'] = DTPlatformName.includes('simulator')
    ? 'simulator'
    : 'device';

  let osType: AppleAppInfo['osType'] = 'iOS';
  if (DTPlatformName.includes('macos')) {
    osType = 'macOS';
  } else if (DTPlatformName.includes('watch')) {
    osType = 'watchOS';
  } else if (DTPlatformName.includes('tv')) {
    osType = 'tvOS';
  }

  // Device builds carry a provisioning profile; read it so the host can tell
  // up front — before a slow install attempt fails — whether the build can
  // install on the target device or must be resigned. Best effort only.
  let provisioning: AppleAppInfo['provisioning'];
  if (deviceType === 'device' && osType !== 'macOS') {
    try {
      provisioning = await readEmbeddedProvisioningProfileAsync(appPath);
    } catch {
      provisioning = undefined;
    }
  }

  return provisioning ? { deviceType, osType, provisioning } : { deviceType, osType };
}
