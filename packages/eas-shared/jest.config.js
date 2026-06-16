/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    // Transpile-only: the library tsconfig intentionally excludes tests (and
    // their jest type globals), so let Jest run them without full type-checking.
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
};
