/// <reference types="wdio-electron-service" />
import os from 'os';

import { sharedConfig } from './wdio.shared';

function getAppBinaryPath(): string {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'darwin') {
    const archSuffix = arch === 'arm64' ? 'arm64' : 'x64';
    return `../electron/out/Expo Orbit-darwin-${archSuffix}/Expo Orbit.app/Contents/MacOS/expo-orbit`;
  }

  if (platform === 'win32') {
    return `../electron/out/Expo Orbit-win32-${arch}/expo-orbit.exe`;
  }

  // Linux
  return `../electron/out/Expo Orbit-linux-${arch}/expo-orbit`;
}

export const config: WebdriverIO.Config = {
  ...sharedConfig,

  capabilities: [
    {
      browserName: 'electron',
      // Must match the electron version in ../electron/package.json so
      // wdio-electron-service fetches a compatible Chromedriver without
      // requiring electron to be installed in this e2e package.
      browserVersion: '33.2.0',
      'wdio:electronServiceOptions': {
        appBinaryPath: getAppBinaryPath(),
      },
    },
  ],

  services: ['electron'],
};
