import { CliCommands } from 'common-types';

type Provisioning = NonNullable<CliCommands.DetectAppleAppType.AppleAppInfo['provisioning']>;

/** Why a build cannot install on a device as signed — i.e. why it needs resigning. */
export type ResignReason = 'app-store' | 'expired' | 'device-not-provisioned';

/**
 * Decide from the embedded provisioning profile whether an install on
 * `deviceUdid` can succeed, so Orbit can offer to resign before trying — a
 * failed device install is slow. Null means the profile covers the device.
 */
export function resignReasonForDevice(
  provisioning: Provisioning,
  deviceUdid: string,
  now: Date = new Date()
): ResignReason | null {
  // App Store / TestFlight profiles list no devices and can never be sideloaded.
  if (provisioning.kind === 'app-store') return 'app-store';
  if (provisioning.expiresAt && new Date(provisioning.expiresAt).getTime() <= now.getTime()) {
    return 'expired';
  }
  if (provisioning.provisionsAllDevices) return null;
  const udid = deviceUdid.toUpperCase();
  const listed = provisioning.provisionedDevices?.some((d) => d.toUpperCase() === udid) ?? false;
  return listed ? null : 'device-not-provisioned';
}

export function describeResignReason(
  reason: ResignReason,
  opts: { deviceName: string; expiresAt?: string }
): { title: string; message: string } {
  switch (reason) {
    case 'app-store':
      return {
        title: 'This is an App Store build',
        message:
          'Builds signed for the App Store or TestFlight can’t be installed directly. Orbit can resign it with your Apple ID and install it.',
      };
    case 'expired':
      return {
        title: 'This build’s provisioning profile has expired',
        message: `It stopped being installable on ${
          opts.expiresAt ? new Date(opts.expiresAt).toLocaleDateString() : 'its expiry date'
        }. Orbit can resign it with your Apple ID and install it.`,
      };
    case 'device-not-provisioned':
      return {
        title: `This build isn’t provisioned for ${opts.deviceName}`,
        message:
          'The device isn’t in the build’s provisioning profile. Orbit can resign it with your Apple ID and install it.',
      };
  }
}
