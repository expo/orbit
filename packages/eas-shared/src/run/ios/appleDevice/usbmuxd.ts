/**
 * Copyright © 2024 650 Industries.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { InternalError } from 'common-types';
import Debug from 'debug';
import fs from 'fs';
import { Socket } from 'net';

import { UsbmuxdClient } from './client/UsbmuxdClient';

const debug = Debug('expo:apple-device:usbmuxd');

// Socket/connection error codes that indicate the usbmux service (the Apple
// Mobile Device Service on Windows, or the usbmuxd daemon on macOS/Linux) is not
// installed or not running.
const NOT_RUNNING_SOCKET_ERROR_CODES = ['ECONNREFUSED', 'ENOENT', 'ECONNRESET', 'EPIPE'];

export type UsbmuxdHelperGuidance = {
  /** Short, human-readable name of the helper software. */
  label: string;
  /** User-facing explanation of what to install and why. */
  description: string;
  /** Optional URL to open so the user can install the helper software. */
  installUrl?: string;
  /** Optional shell command that installs the helper software. */
  installCommand?: string;
  /** Optional shell command that starts the (already installed) helper service. */
  startCommand?: string;
};

// Known locations of the usbmuxd daemon binary on Linux.
const LINUX_USBMUXD_BINARY_PATHS = [
  '/usr/sbin/usbmuxd',
  '/usr/local/sbin/usbmuxd',
  '/sbin/usbmuxd',
  '/usr/bin/usbmuxd',
  '/bin/usbmuxd',
];

/** Whether the usbmuxd daemon binary is installed (Linux only). */
export function isUsbmuxdInstalled(): boolean {
  return LINUX_USBMUXD_BINARY_PATHS.some((binaryPath) => fs.existsSync(binaryPath));
}

/**
 * Per-platform guidance for getting the helper software required to talk to a
 * physical iPhone over USB into a working state. None of this requires an Apple
 * account.
 */
export function getUsbmuxdHelperGuidance(): UsbmuxdHelperGuidance {
  switch (process.platform) {
    case 'win32':
      return {
        label: 'Apple Mobile Device Support',
        description:
          'To connect to an iPhone over USB on Windows, Orbit can install Apple Mobile Device Support — the official Apple USB driver and device service. No Apple account or full iTunes install is required.',
        // Manual fallback if winget isn't available: the Apple Devices app on the
        // Microsoft Store also bundles Apple Mobile Device Support.
        installUrl: 'https://apps.microsoft.com/detail/9np83lwlpz9k',
        installCommand: 'winget install --id Apple.AppleMobileDeviceSupport -e',
      };
    case 'linux':
      // usbmuxd is socket/udev-activated: it only runs while an Apple device is
      // attached and exits afterwards. If the binary is present but unreachable,
      // it just needs starting — telling the user to reinstall would be wrong.
      return isUsbmuxdInstalled()
        ? {
            label: 'usbmuxd',
            description:
              'usbmuxd is installed but not running. Connect and unlock your iPhone and tap "Trust" — usbmuxd starts automatically when a device is attached. If it still does not appear, run `sudo systemctl start usbmuxd`.',
            startCommand: 'sudo systemctl start usbmuxd',
          }
        : {
            label: 'usbmuxd',
            description:
              'To connect to an iPhone over USB on Linux, install the usbmuxd daemon from the libimobiledevice project.',
            installCommand: 'sudo apt-get install -y usbmuxd',
          };
    default:
      return {
        label: 'Apple Mobile Device Service',
        description:
          'usbmuxd ships with macOS, so no additional software is required. Make sure your iPhone is unlocked and that you have tapped "Trust" on it.',
      };
  }
}

/** Whether a socket/connection error indicates the usbmux service is not reachable. */
export function isUsbmuxdNotRunningError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' && NOT_RUNNING_SOCKET_ERROR_CODES.includes(code);
}

/** Build the InternalError surfaced to the CLI/menu-bar when the service is down. */
export function createUsbmuxdNotRunningError(): InternalError {
  const guidance = getUsbmuxdHelperGuidance();
  const details: Record<string, string> = { label: guidance.label };
  if (guidance.installUrl) {
    details.installUrl = guidance.installUrl;
  }
  if (guidance.installCommand) {
    details.installCommand = guidance.installCommand;
  }
  if (guidance.startCommand) {
    details.startCommand = guidance.startCommand;
  }
  return new InternalError('APPLE_DEVICE_USBMUXD_NOT_RUNNING', guidance.description, details);
}

/**
 * Connect to the usbmux socket (the Apple Mobile Device Service on Windows, or the
 * usbmuxd daemon socket on macOS/Linux), resolving only once the connection is
 * established. Rejects with a friendly InternalError when the service is not
 * running so callers can guide the user to install the helper software.
 *
 * Using this instead of the raw, synchronous `connectUsbmuxdSocket()` for the
 * initial connection avoids an uncaught exception: the protocol layer's `error`
 * handler throws, so a connection that fails after a `sendMessage` call would
 * otherwise crash the process instead of rejecting a promise.
 */
export function connectUsbmuxdSocketAsync(timeoutMs = 5000): Promise<Socket> {
  return new Promise<Socket>((resolve, reject) => {
    const socket = UsbmuxdClient.connectUsbmuxdSocket();
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeListener('connect', onConnect);
      socket.removeListener('error', onError);
    };
    const onConnect = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(socket);
    };
    const onError = (error: NodeJS.ErrnoException) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      try {
        socket.destroy();
      } catch {}
      if (isUsbmuxdNotRunningError(error)) {
        debug('usbmux service not reachable: %O', error);
        reject(createUsbmuxdNotRunningError());
      } else {
        reject(error);
      }
    };
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      try {
        socket.destroy();
      } catch {}
      reject(createUsbmuxdNotRunningError());
    }, timeoutMs);

    socket.once('connect', onConnect);
    socket.once('error', onError);
  });
}

/** Lightweight check used by doctor/UX flows — never throws. */
export async function isUsbmuxdAvailableAsync(): Promise<boolean> {
  try {
    const socket = await connectUsbmuxdSocketAsync(2000);
    socket.end();
    return true;
  } catch {
    return false;
  }
}
