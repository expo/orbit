import MenuBarModule from '../modules/MenuBarModule';

type LaunchExpoGoAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
  url: string;
  sdkVersion?: string | null;
};

export const launchExpoGoAsync = async ({
  url,
  platform,
  deviceId,
  sdkVersion,
}: LaunchExpoGoAsyncOptions) => {
  const args = [url, '-p', platform, '--device-id', deviceId];
  if (sdkVersion) {
    args.push('--sdk-version', sdkVersion);
  }

  await MenuBarModule.runCli('launch-expo-go', args, console.log);
};
