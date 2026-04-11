import type { Options } from '@wdio/types';

export const sharedConfig: Partial<Options.Testrunner> = {
  runner: 'local',
  tsConfigPath: './tsconfig.json',

  specs: ['./specs/**/*.e2e.ts'],
  exclude: [],

  maxInstances: 1,

  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
};
