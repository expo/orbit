import MenuBarModule from '../modules/MenuBarModule';

/** Remove an app from a physical iOS device (see the CLI's `uninstall-app`). */
export async function uninstallAppAsync(opts: {
  deviceId: string;
  bundleId: string;
}): Promise<void> {
  await MenuBarModule.runCli('uninstall-app', [
    '--device-id',
    opts.deviceId,
    '--bundle-id',
    opts.bundleId,
  ]);
}
