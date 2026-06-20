import spawnAsync from '@expo/spawn-async';

/**
 * Best-effort install of the helper software needed to talk to a physical iPhone
 * over USB.
 *
 * - Linux: installs the open-source `usbmuxd` daemon via the system package
 *   manager, using `pkexec` for the privilege prompt.
 * - Windows: installs Apple Mobile Device Support via winget — the lightweight
 *   official package with just the Apple USB driver and the Apple Mobile Device
 *   Service (no full iTunes/Apple Devices app).
 * - macOS: no-op — natively supported.
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
    await installOnWindowsAsync();
    return;
  }
}

async function installOnWindowsAsync(): Promise<void> {
  try {
    await spawnAsync('winget', [
      'install',
      '--id',
      'Apple.AppleMobileDeviceSupport',
      '-e',
      '--silent',
      '--accept-package-agreements',
      '--accept-source-agreements',
    ]);
  } catch (error: any) {
    // `winget` itself is missing (App Installer not present) — let the caller fall
    // back to opening the official download page.
    if (error?.code === 'ENOENT') {
      throw new Error(
        'winget is not available on this machine. Install Apple Mobile Device Support (or the Apple Devices app) manually.'
      );
    }
    throw error;
  }
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
