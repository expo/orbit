import MenuBarModule from '../modules/MenuBarModule';

type InstallAndLaunchAppAsyncOptions = {
  platform: 'android' | 'ios';
  appPath: string;
  deviceId: string;
};

export const installAndLaunchAppAsync = async ({
  platform,
  appPath,
  deviceId,
}: InstallAndLaunchAppAsyncOptions) => {
  await MenuBarModule.runCli(
    'install-and-launch',
    ['-p', platform, '--app-path', appPath, '--device-id', deviceId],
    undefined,
  );
};
