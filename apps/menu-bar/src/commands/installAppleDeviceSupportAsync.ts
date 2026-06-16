import MenuBarModule from '../modules/MenuBarModule';

/**
 * Installs the helper software required to connect to a physical iPhone over USB
 * (usbmuxd on Linux, the Apple Devices app on Windows). No-op on macOS.
 */
export const installAppleDeviceSupportAsync = async () => {
  await MenuBarModule.runCli('install-apple-device-support', [], console.log);
};
