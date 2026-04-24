import fs from 'fs';
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

const appExists = fs.existsSync(MACOS_APP_PATH);

if (appExists) {
  console.log(`[e2e] Launching macOS app from: ${MACOS_APP_PATH}`);
} else {
  console.warn(
    `[e2e] ${MACOS_APP_PATH} does not exist — falling back to installed app ` +
      `with bundleId 'dev.expo.orbit'. Set MACOS_APP_PATH to a built .app, or ` +
      `build the Release configuration from apps/menu-bar/macos.`
  );
}

// If the requested .app is missing, fall back to activating an already installed
// app via bundleId. Never set both simultaneously — when both are present, the
// driver prefers the installed app with that bundle ID and ignores `appium:app`.
const appCap: WebdriverIO.Capabilities = appExists
  ? ({ 'appium:appPath': MACOS_APP_PATH } as WebdriverIO.Capabilities)
  : ({ 'appium:bundleId': 'dev.expo.orbit' } as WebdriverIO.Capabilities);

export const config: WebdriverIO.Config = {
  ...sharedConfig,

  capabilities: [
    {
      platformName: 'mac',
      'appium:automationName': 'Mac2',
      ...appCap,
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
