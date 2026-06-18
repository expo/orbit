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
  .command('pair-android-device')
  .description('Pair a physical Android device over Wi-Fi')
  .requiredOption('--mode  <string>', 'Pairing mode: "code" (manual address) or "qr" (scanned)')
  .option('--pairing-code  <string>', '"code" mode: pairing code shown on the device')
  .option('--pairing-address  <string>', '"code" mode: IP address and port shown on the pairing dialog')
  .option(
    '--connect-address  <string>',
    '"code" mode: IP address and port used to connect to the device after pairing'
  )
  .option('--timeout  <number>', '"qr" mode: time to wait for the device to scan, in milliseconds')
  .action(async (...args) => {
    const { pairAndroidDeviceAsync } = await import('./commands/PairAndroidDevice');
    return returnLoggerMiddleware(pairAndroidDeviceAsync)(...args);
  });

program
  .command('list-android-pairing-services')
  .description('List Android devices advertising a Wi-Fi pairing service over mDNS')
  .action(async (...args) => {
    const { listAndroidPairingServicesAsync } = await import('./commands/PairAndroidDevice');
    return returnLoggerMiddleware(listAndroidPairingServicesAsync)(...args);
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

program
  .command('apple-id-auth')
  .description('Sign in / verify 2FA / sign out for the Apple ID used by IPA resigning')
  .requiredOption('--mode <string>', 'sign-in | verify-2fa | sign-out')
  .requiredOption('--apple-id <string>', 'Apple ID email')
  .option('--code <string>', '2FA code (when --mode verify-2fa)')
  .action(async (...args) => {
    const { appleIdAuthAsync } = await import('./commands/AppleIdAuth');
    return returnLoggerMiddleware(appleIdAuthAsync)(...args);
  });

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
  .action(async (...args) => {
    const { resignIpaCommandAsync } = await import('./commands/ResignIpa');
    return returnLoggerMiddleware(resignIpaCommandAsync)(...args);
  });

program
  .command('list-app-ids')
  .description('List the App IDs registered to the Apple ID (free accounts cap at 10 per 7 days)')
  .requiredOption('--apple-id <string>', 'Apple ID email')
  .action(async (...args) => {
    const { listAppIdsAsync } = await import('./commands/AppleAppIds');
    return returnLoggerMiddleware(listAppIdsAsync)(...args);
  });

program
  .command('delete-app-id')
  .description('Delete an App ID by its portal id (from list-app-ids) to free a slot')
  .requiredOption('--apple-id <string>', 'Apple ID email')
  .requiredOption('--app-id-id <string>', 'Portal App ID id (the appIdId from list-app-ids)')
  .action(async (...args) => {
    const { deleteAppIdAsync } = await import('./commands/AppleAppIds');
    return returnLoggerMiddleware(deleteAppIdAsync)(...args);
  });

if (process.argv.length < 3) {
  program.help();
}
program.parse(process.argv);
