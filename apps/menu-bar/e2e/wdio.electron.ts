/// <reference types="wdio-electron-service" />
import os from 'os';
import path from 'path';

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

// Chromedriver defaults to a throwaway --user-data-dir per session, which wipes
// MMKV-on-web state (has-seen-onboarding, etc.) between wdio runs. Pin it to a
// stable path so state matches a normal Orbit launch; reset-state.sh clears it.
export const USER_DATA_DIR = path.resolve(os.tmpdir(), 'orbit-e2e-user-data');

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
        appArgs: [`--user-data-dir=${USER_DATA_DIR}`],
      },
    },
  ],

  // We don't use browser.electron.{execute,mock,...}, so skip the CDP bridge.
  // It adds ~10–40s of startup latency (Runtime.executionContextCreated wait +
  // retries) and produces spurious "Timeout exceeded to get the ContextId" logs.
  services: [['electron', { useCdpBridge: false }]],
};
