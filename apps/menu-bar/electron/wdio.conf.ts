/// <reference types="wdio-electron-service" />
import path from 'path';
import os from 'os';

function getAppBinaryPath(): string {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'darwin') {
    const archSuffix = arch === 'arm64' ? 'arm64' : 'x64';
    return `./out/Expo Orbit-darwin-${archSuffix}/Expo Orbit.app/Contents/MacOS/expo-orbit`;
  }

  if (platform === 'win32') {
    return `./out/Expo Orbit-win32-${arch}/expo-orbit.exe`;
  }

  // Linux
  return `./out/Expo Orbit-linux-${arch}/expo-orbit`;
}

export const config: WebdriverIO.Config = {
  runner: 'local',
  tsConfigPath: './test/tsconfig.json',

  specs: ['./test/specs/**/*.ts'],
  exclude: [],

  maxInstances: 1,

  capabilities: [
    {
      browserName: 'electron',
      'wdio:electronServiceOptions': {
        appBinaryPath: getAppBinaryPath(),
      },
    },
  ],

  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: ['electron'],
  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
};
