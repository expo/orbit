import { Command } from 'commander';

import { returnLoggerMiddleware } from './utils';
import { downloadBuildAsync } from './commands/DownloadBuild';
import { listDevicesAsync } from './commands/ListDevices';
import { bootDeviceAsync } from './commands/BootDevice';
import { installAndLaunchAppAsync } from './commands/InstallAndLaunchApp';
import { launchExpoGoURLAsync } from './commands/LaunchExpoGo';
import { checkToolsAsync } from './commands/CheckTools';
import { setSessionAsync } from './commands/SetSession';
import { detectIOSAppTypeAsync } from './commands/DetectIOSAppType';
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
  .command('install-and-launch')
  .requiredOption('--app-path  <string>', 'Local path of the app')
  .requiredOption('--device-id  <string>', 'UDID or name of the device')
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
  .command('detect-ios-app-type')
  .argument('<string>', 'Local path of the app')
  .action(returnLoggerMiddleware(detectIOSAppTypeAsync));

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
