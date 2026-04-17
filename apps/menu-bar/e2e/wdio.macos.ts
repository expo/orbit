import path from 'path';

import { sharedConfig } from './wdio.shared';

// The appium-mac2-driver resolves `appium:app` from WebDriverAgentRunner's
// sandboxed working directory, so we must pass an absolute path.
const DEFAULT_APP_PATH = path.resolve(
  __dirname,
  '../macos/build/Build/Products/Release/Expo Orbit.app'
);
const MACOS_APP_PATH = process.env.MACOS_APP_PATH
  ? path.resolve(process.env.MACOS_APP_PATH)
  : DEFAULT_APP_PATH;

export const config: WebdriverIO.Config = {
  ...sharedConfig,

  capabilities: [
    {
      platformName: 'mac',
      'appium:automationName': 'Mac2',
      'appium:bundleId': 'dev.expo.orbit',
      'appium:app': MACOS_APP_PATH,
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
