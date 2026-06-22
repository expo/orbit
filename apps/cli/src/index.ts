import { Command } from 'commander';

import { returnLoggerMiddleware } from './utils';
// Command modules that pull in `eas-shared`/GraphQL are loaded lazily inside their actions so a
// single invocation only pays the import cost of the command actually being run. Keep light
// modules (TrustedSources) eager since the validator middleware is needed up front.
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
  .action(async (...args) => {
    const { downloadBuildAsync } = await import('./commands/DownloadBuild');
    return returnLoggerMiddleware(trustedSourcesValidatorMiddleware(downloadBuildAsync))(...args);
  });

program
  .command('list-devices')
  .option('-p, --platform <string>', 'Selected platform', 'all')
  .action(async (...args) => {
    const { listDevicesAsync } = await import('./commands/ListDevices');
    return returnLoggerMiddleware(listDevicesAsync)(...args);
  });

program
  .command('boot-device')
  .requiredOption('-p, --platform <string>', 'Selected platform')
  .requiredOption('--id  <string>', 'UDID or name of the device')
  .option('--no-audio', 'Launch Android emulator without audio')
  .action(async (...args) => {
    const { bootDeviceAsync } = await import('./commands/BootDevice');
    return returnLoggerMiddleware(bootDeviceAsync)(...args);
  });

program
  .command('install-and-launch')
  .requiredOption('--app-path  <string>', 'Local path of the app')
  .option('--device-id  <string>', 'UDID or name of the device')
  .option('--launch-url  <string>', 'URL to open on the device after installing the app')
  .action(async (...args) => {
    const { installAndLaunchAppAsync } = await import('./commands/InstallAndLaunchApp');
    return returnLoggerMiddleware(installAndLaunchAppAsync)(...args);
  });

program
  .command('launch-expo-go')
  .argument('<string>', 'Snack URL')
  .requiredOption('-p, --platform <string>', 'Selected platform')
  .requiredOption('--device-id  <string>', 'UDID or name of the device')
  .option(
    '--sdk-version  <string>',
    'Version of the Expo SDK that should be used by Expo Go. E.g. 52.0.0'
  )
  .action(async (...args) => {
    const { launchExpoGoURLAsync } = await import('./commands/LaunchExpoGo');
    return returnLoggerMiddleware(trustedSourcesValidatorMiddleware(launchExpoGoURLAsync))(...args);
  });

program
  .command('install-apple-device-support')
  .description('Install the helper software required to connect to a physical iPhone over USB')
  .action(async (...args) => {
    const { installAppleDeviceSupportAsync } = await import('./commands/InstallAppleDeviceSupport');
    return returnLoggerMiddleware(installAppleDeviceSupportAsync)(...args);
  });

program
  .command('check-tools')
  .option('-p, --platform <string>', 'Selected platform')
  .action(async (...args) => {
    const { checkToolsAsync } = await import('./commands/CheckTools');
    return returnLoggerMiddleware(checkToolsAsync)(...args);
  });

program
  .command('launch-update')
  .argument('<string>', 'Update URL')
  .requiredOption('-p, --platform <string>', 'Selected platform')
  .requiredOption('--device-id  <string>', 'UDID or name of the device')
  .option('--skip-install', 'Skip app installation')
  .option('--force-expo-go', 'Force update to be launched using Expo Go')
  .action(async (...args) => {
    const { launchUpdateAsync } = await import('./commands/LaunchUpdate');
    return returnLoggerMiddleware(trustedSourcesValidatorMiddleware(launchUpdateAsync))(...args);
  });

program
  .command('set-session')
  .argument('<string>', 'Session secret')
  .action(async (...args) => {
    const { setSessionAsync } = await import('./commands/SetSession');
    return returnLoggerMiddleware(setSessionAsync)(...args);
  });

program
  .command('detect-apple-app-type')
  .argument('<string>', 'Local path of the app')
  .action(async (...args) => {
    const { detectAppleAppTypeAsync } = await import('./commands/DetectAppleAppType');
    return returnLoggerMiddleware(detectAppleAppTypeAsync)(...args);
  });

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
