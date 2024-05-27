import { Command } from 'commander';

import { downloadBuildAsync } from './commands/DownloadBuild';
import { listDevicesAsync } from './commands/ListDevices';
import { bootDeviceAsync } from './commands/BootDevice';
import { installAndLaunchAppAsync } from './commands/InstallAndLaunchApp';
import { launchSnackAsync } from './commands/LaunchSnack';
import { checkToolsAsync } from './commands/CheckTools';
import { setSessionAsync } from './commands/SetSession';
import { detectIOSAppTypeAsync } from './commands/DetectIOSAppType';
import { returnLoggerMiddleware } from './utils';

const program = new Command();

program
  .name('expo-orbit-cli')
  .description('The command-line tool used internally by Expo Orbit menu bar');

program
  .command('download-build')
  .argument('<string>', 'Build URL')
  .action(returnLoggerMiddleware(downloadBuildAsync));

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
  .command('launch-snack')
  .argument('<string>', 'Snack URL')
  .requiredOption('-p, --platform <string>', 'Selected platform')
  .requiredOption('--device-id  <string>', 'UDID or name of the device')
  .action(returnLoggerMiddleware(launchSnackAsync));

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
  .action(async (...args) => {
    const { launchUpdateAsync } = await import('./commands/LaunchUpdate');
    returnLoggerMiddleware(launchUpdateAsync)(...args);
  });

program
  .command('set-session')
  .argument('<string>', 'Session secret')
  .action(returnLoggerMiddleware(setSessionAsync));

program
  .command('detect-ios-app-type')
  .argument('<string>', 'Local path of the app')
  .action(returnLoggerMiddleware(detectIOSAppTypeAsync));

if (process.argv.length < 3) {
  program.help();
}
program.parse(process.argv);
