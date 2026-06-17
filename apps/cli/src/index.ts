import { Command } from 'commander';

import { returnLoggerMiddleware } from './utils';
import { appleIdAuthAsync } from './commands/AppleIdAuth';
import { downloadBuildAsync } from './commands/DownloadBuild';
import { listDevicesAsync } from './commands/ListDevices';
import { bootDeviceAsync } from './commands/BootDevice';
import { installAndLaunchAppAsync } from './commands/InstallAndLaunchApp';
import { installAppleDeviceSupportAsync } from './commands/InstallAppleDeviceSupport';
import { launchExpoGoURLAsync } from './commands/LaunchExpoGo';
import { checkToolsAsync } from './commands/CheckTools';
import { resignIpaCommandAsync } from './commands/ResignIpa';
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

program
  .command('apple-id-auth')
  .description('Sign in / verify 2FA / sign out for the Apple ID used by IPA resigning')
  .requiredOption('--mode <string>', 'sign-in | verify-2fa | sign-out')
  .requiredOption('--apple-id <string>', 'Apple ID email')
  .option('--code <string>', '2FA code (when --mode verify-2fa)')
  .action(returnLoggerMiddleware(appleIdAuthAsync));

program
  .command('resign-ipa')
  .description('Resign an IPA with a free Apple ID-issued certificate for the given device')
  .requiredOption('--ipa <string>', 'Path to the input IPA')
  .requiredOption('--udid <string>', 'UDID of the target physical iPhone / iPad')
  .requiredOption('--device-name <string>', 'Friendly name for the device (used in Apple portal)')
  .requiredOption('--apple-id <string>', 'Apple ID that owns the signing identity')
  .option('--output <string>', 'Path to the resigned IPA (default: alongside the input)')
  .option(
    '--strip-extensions',
    'Remove PlugIns/*.appex and Watch/* before signing (free-account App ID limit)'
  )
  .action(returnLoggerMiddleware(resignIpaCommandAsync));

if (process.argv.length < 3) {
  program.help();
}
program.parse(process.argv);
