import MenuBarModule from '../modules/MenuBarModule';

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId?: string;
};

export const installAndLaunchAppAsync = async ({
  appPath,
  deviceId,
}: InstallAndLaunchAppAsyncOptions) => {
  const args = ['--app-path', appPath];
  if (deviceId) {
    args.push('--device-id', deviceId);
  }
  await MenuBarModule.runCli('install-and-launch', args, undefined);
};
