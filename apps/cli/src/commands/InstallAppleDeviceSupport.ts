import spawnAsync from '@expo/spawn-async';

/**
 * Best-effort install of the helper software needed to talk to a physical iPhone
 * over USB. None of this requires an Apple account.
 *
 * - Linux: installs the open-source `usbmuxd` daemon via the system package
 *   manager, using `pkexec` for the privilege prompt.
 * - Windows: installs the Apple Devices app via winget (it bundles the Apple USB
 *   drivers and the Apple Mobile Device Service).
 * - macOS: no-op — usbmuxd ships with the OS.
 */
export async function installAppleDeviceSupportAsync(): Promise<void> {
  if (process.platform === 'darwin') {
    return;
  }

  if (process.platform === 'linux') {
    await installOnLinuxAsync();
    return;
  }

  if (process.platform === 'win32') {
    await spawnAsync('winget', [
      'install',
      '--id',
      'Apple.AppleDevices',
      '-e',
      '--accept-package-agreements',
      '--accept-source-agreements',
    ]);
    return;
  }

  throw new Error(`Installing Apple device support is not supported on ${process.platform}.`);
}

async function installOnLinuxAsync(): Promise<void> {
  // Prefer apt (Debian/Ubuntu), fall back to dnf (Fedora/RHEL).
  const managers: { bin: string; args: string[] }[] = [
    { bin: 'apt-get', args: ['install', '-y', 'usbmuxd'] },
    { bin: 'dnf', args: ['install', '-y', 'usbmuxd'] },
  ];

  for (const { bin, args } of managers) {
    if (await commandExistsAsync(bin)) {
      // `pkexec` shows the graphical privilege prompt, mirroring the auto-updater.
      await spawnAsync('pkexec', [bin, ...args]);
      return;
    }
  }

  throw new Error(
    'Could not find a supported package manager (apt-get or dnf). Install the usbmuxd package manually.'
  );
}

async function commandExistsAsync(bin: string): Promise<boolean> {
  try {
    await spawnAsync('which', [bin]);
    return true;
  } catch {
    return false;
  }
}
