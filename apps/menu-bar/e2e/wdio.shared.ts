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

  before: async () => {
    // Dump the accessibility tree for debugging. Remove once tests are stable.
    if (process.env.E2E_DEBUG) {
      // Wait a bit for the app to fully render
      await new Promise((r) => setTimeout(r, 3000));
      const source = await browser.getPageSource();
      console.log('[e2e] Accessibility tree:\n', source);
    }
  },
};
