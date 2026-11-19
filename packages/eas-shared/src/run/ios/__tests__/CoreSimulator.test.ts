import { parseSimRuntime } from '../CoreSimulator';

it('parses the OS type and version from a simulator runtime', () => {
  const prefix = 'com.apple.CoreSimulator.SimRuntime.';
  expect(parseSimRuntime(`${prefix}tvOS-13-4`)).toEqual({ osType: 'tvOS', osVersion: '13.4' });
  // Device-specific runtimes (e.g. for iPhone Duo) add a suffix after the version.
  expect(parseSimRuntime(`${prefix}iOS-27-2-iPhone19-4`)).toEqual({
    osType: 'iOS',
    osVersion: '27.2',
  });
});
