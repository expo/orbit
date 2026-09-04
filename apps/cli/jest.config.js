const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  // Stale compiled tests can linger in build/ from before tsconfig excluded them.
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/'],
  transform: {
    ...tsJestTransformCfg,
  },
};
