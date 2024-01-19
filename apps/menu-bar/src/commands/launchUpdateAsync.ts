import MenuBarModule from '../modules/MenuBarModule';
import { MenuBarStatus, extractDownloadProgress } from '../utils/helpers';

type LaunchUpdateAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
  url: string;
};

type LaunchUpdateCallback = (status: MenuBarStatus, progress: number) => void;

export async function launchUpdateAsync(
  { url, platform, deviceId }: LaunchUpdateAsyncOptions,
  callback: LaunchUpdateCallback
) {
  await MenuBarModule.runCli(
    'launch-update',
    [url, '-p', platform, '--device-id', deviceId],
    (output) => {
      if (output.includes('Downloading app')) {
        callback(MenuBarStatus.DOWNLOADING, extractDownloadProgress(output));
      } else if (output.includes('Installing your app')) {
        callback(MenuBarStatus.INSTALLING_APP, 0);
      } else if (output.includes('Opening url')) {
        callback(MenuBarStatus.OPENING_UPDATE, 0);
      }
      // Add other conditions for different status updates as needed
    }
  );
}
