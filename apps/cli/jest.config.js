/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    // Point ts-jest at the test-only tsconfig; the default `tsconfig.json` excludes `*.test.ts`,
    // which stops the Jest globals from resolving.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};
