import { Command } from 'commander';

import { returnLoggerMiddleware } from './utils';
import { downloadBuildAsync } from './commands/DownloadBuild';
import { listDevicesAsync } from './commands/ListDevices';
import { bootDeviceAsync } from './commands/BootDevice';
import {
  pairAndroidDeviceAsync,
  pairAndroidDeviceWithQRCodeAsync,
} from './commands/PairAndroidDevice';
import { installAndLaunchAppAsync } from './commands/InstallAndLaunchApp';
import { installAppleDeviceSupportAsync } from './commands/InstallAppleDeviceSupport';
import { launchExpoGoURLAsync } from './commands/LaunchExpoGo';
import { checkToolsAsync } from './commands/CheckTools';
import { setSessionAsync } from './commands/SetSession';
import { detectAppleAppTypeAsync } from './commands/DetectAppleAppType';
import {
  getCustomTrustedSourcesAsync,
  setCustomTrustedSourcesAsync,
  trustedSourcesValidatorMiddleware,
} from './commands/TrustedSources';

const program = new Command();

program
  .name('expo-orbit-cli')
  .description('The command-line tool used internally by Expo Orbit menu bar');

program
  .command('download-build')
  .argument('<string>', 'Build URL')
  .action(returnLoggerMiddleware(trustedSourcesValidatorMiddleware(downloadBuildAsync)));

program
  .command('list-devices')
  .option('-p, --platform <string>', 'Selected platform', 'all')
  .action(returnLoggerMiddleware(listDevicesAsync));

program
  .command('boot-device')
  .requiredOption('-p, --platform <string>', 'Selected platform')
  .requiredOption('--id  <string>', 'UDID or name of the device')
  .option('--no-audio', 'Launch Android emulator without audio')
  .action(returnLoggerMiddleware(bootDeviceAsync));

program
  .command('pair-android-device')
  .description('Pair a physical Android device over Wi-Fi using a pairing code')
  .requiredOption('--pairing-address  <string>', 'IP address and port shown on the pairing dialog')
  .requiredOption('--pairing-code  <string>', 'Six digit pairing code shown on the pairing dialog')
  .option(
    '--connect-address  <string>',
    'IP address and port used to connect to the device after pairing'
  )
  .action(returnLoggerMiddleware(pairAndroidDeviceAsync));

program
  .command('pair-android-device-qr')
  .description('Pair a physical Android device over Wi-Fi after it scans a pairing QR code')
  .requiredOption('--service-name  <string>', 'mDNS service name embedded in the QR code')
  .requiredOption('--pairing-code  <string>', 'Pairing code embedded in the QR code')
  .option('--timeout  <number>', 'Time to wait for the device to scan the QR code, in milliseconds')
  .action(returnLoggerMiddleware(pairAndroidDeviceWithQRCodeAsync));

program
  .command('install-and-launch')
  .requiredOption('--app-path  <string>', 'Local path of the app')
  .option('--device-id  <string>', 'UDID or name of the device')
  .option('--launch-url  <string>', 'URL to open on the device after installing the app')
  .action(returnLoggerMiddleware(installAndLaunchAppAsync));

program
  .command('launch-expo-go')
  .argument('<string>', 'Snack URL')
  .requiredOption('-p, --platform <string>', 'Selected platform')
  .requiredOption('--device-id  <string>', 'UDID or name of the device')
  .option(
    '--sdk-version  <string>',
    'Version of the Expo SDK that should be used by Expo Go. E.g. 52.0.0'
  )
  .action(returnLoggerMiddleware(trustedSourcesValidatorMiddleware(launchExpoGoURLAsync)));

program
  .command('install-apple-device-support')
  .description('Install the helper software required to connect to a physical iPhone over USB')
  .action(returnLoggerMiddleware(installAppleDeviceSupportAsync));

program
  .command('check-tools')
  .option('-p, --platform <string>', 'Selected platform')
  .action(returnLoggerMiddleware(checkToolsAsync));

program
  .command('launch-update')
  .argument('<string>', 'Update URL')
  .requiredOption('-p, --platform <string>', 'Selected platform')
  .requiredOption('--device-id  <string>', 'UDID or name of the device')
  .option('--skip-install', 'Skip app installation')
  .option('--force-expo-go', 'Force update to be launched using Expo Go')
  .action(async (...args) => {
    const { launchUpdateAsync } = await import('./commands/LaunchUpdate');
    returnLoggerMiddleware(trustedSourcesValidatorMiddleware(launchUpdateAsync))(...args);
  });

program
  .command('set-session')
  .argument('<string>', 'Session secret')
  .action(returnLoggerMiddleware(setSessionAsync));

program
  .command('detect-apple-app-type')
  .argument('<string>', 'Local path of the app')
  .action(returnLoggerMiddleware(detectAppleAppTypeAsync));

program
  .command('get-custom-trusted-sources')
  .action(returnLoggerMiddleware(getCustomTrustedSourcesAsync));

program
  .command('set-custom-trusted-sources')
  .argument('<string>', 'Trusted sources')
  .action(returnLoggerMiddleware(setCustomTrustedSourcesAsync));

if (process.argv.length < 3) {
  program.help();
}
program.parse(process.argv);
