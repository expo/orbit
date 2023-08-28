import MenuBarModule from '../modules/MenuBarModule';

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId: string;
};

export const installAndLaunchAppAsync = async ({
  appPath,
  deviceId,
}: InstallAndLaunchAppAsyncOptions) => {
  await MenuBarModule.runCli(
    'install-and-launch',
    ['--app-path', appPath, '--device-id', deviceId],
    undefined
  );
};
