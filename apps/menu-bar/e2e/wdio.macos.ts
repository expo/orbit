import { sharedConfig } from './wdio.shared';

const MACOS_APP_PATH =
  process.env.MACOS_APP_PATH || '../macos/build/Build/Products/Release/Expo Orbit.app';

export const config: WebdriverIO.Config = {
  ...sharedConfig,

  capabilities: [
    {
      platformName: 'mac',
      'appium:automationName': 'Mac2',
      'appium:bundleId': 'dev.expo.orbit',
      // Use app path if running against a local build instead of an installed app
      ...(MACOS_APP_PATH ? { 'appium:appPath': MACOS_APP_PATH } : {}),
    } as WebdriverIO.Capabilities,
  ],

  services: [
    [
      'appium',
      {
        args: {
          relaxedSecurity: true,
        },
      },
    ],
  ],
};
