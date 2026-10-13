import { freeAppLimitBundleIds, isFreeAppLimitError } from '../freeAppLimit';

const DEVICECTL =
  'ERROR: The maximum number of apps for free development profiles has been reached. ' +
  '(com.apple.dt.MobileDeviceErrorDomain error -402620383)';

const USBMUX =
  'This device has reached the maximum number of installed apps using a free developer profile: {(\n' +
  '    "com.gabrieldonadel.entangle-mobile.orbit07bcf83b",\n' +
  '    "com.petri.calculator.calculator.orbite9ad5650",\n' +
  '    "com.gabrieldonadel.agentdevice.runner"\n' +
  ')}';

describe(isFreeAppLimitError, () => {
  it('recognises both of Apple’s wordings and nothing else', () => {
    expect(isFreeAppLimitError(DEVICECTL)).toBe(true);
    expect(isFreeAppLimitError(USBMUX)).toBe(true);
    expect(isFreeAppLimitError('ApplicationVerificationFailed')).toBe(false);
    expect(isFreeAppLimitError(undefined)).toBe(false);
  });
});

describe(freeAppLimitBundleIds, () => {
  it('lists the bundle ids from the usbmux wording', () => {
    expect(freeAppLimitBundleIds(USBMUX)).toEqual([
      'com.gabrieldonadel.entangle-mobile.orbit07bcf83b',
      'com.petri.calculator.calculator.orbite9ad5650',
      'com.gabrieldonadel.agentdevice.runner',
    ]);
  });

  it('is empty when the wording carries no list', () => {
    expect(freeAppLimitBundleIds(DEVICECTL)).toEqual([]);
    expect(freeAppLimitBundleIds(undefined)).toEqual([]);
  });
});
