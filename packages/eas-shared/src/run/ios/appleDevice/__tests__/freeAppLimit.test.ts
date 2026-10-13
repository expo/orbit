import {
  freeAppLimitBundleIds,
  freeDeveloperProfileApp,
  freeProfileApps,
  isFreeAppLimitError,
} from '../freeAppLimit';

// A .mobileprovision is a CMS blob with the XML plist inline; wrap a plist in
// junk bytes the way the real DER framing does.
function profileBlob(plistBody: string): Buffer {
  const plist =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<plist version="1.0"><dict>${plistBody}</dict></plist>`;
  return Buffer.concat([
    Buffer.from([0x30, 0x82, 0x31, 0x7e, 0x06, 0x09, 0x2a, 0x86]),
    Buffer.from(plist),
    Buffer.from([0x31, 0x82, 0x0f, 0x00]),
  ]);
}

function devProfile(opts: { days: number; appId: string; taskAllow?: boolean }): Buffer {
  return profileBlob(
    '<key>TeamIdentifier</key><array><string>XCS68MU4RC</string></array>' +
      '<key>CreationDate</key><date>2026-10-10T10:00:00Z</date>' +
      `<key>ExpirationDate</key><date>${new Date(
        Date.parse('2026-10-10T10:00:00Z') + opts.days * 86400000
      ).toISOString()}</date>` +
      '<key>Entitlements</key><dict>' +
      `<key>application-identifier</key><string>${opts.appId}</string>` +
      `<key>get-task-allow</key><${opts.taskAllow === false ? 'false' : 'true'}/>` +
      '</dict>'
  );
}

describe(freeDeveloperProfileApp, () => {
  it('recognises a free Apple ID’s seven-day development profile and strips the team prefix', () => {
    expect(
      freeDeveloperProfileApp(devProfile({ days: 7, appId: 'XCS68MU4RC.com.petri.calculator' }))
    ).toEqual({
      bundleId: 'com.petri.calculator',
      teamId: 'XCS68MU4RC',
      expiresAt: '2026-10-17T10:00:00.000Z',
    });
  });

  it('ignores paid-team development profiles, distribution profiles and junk', () => {
    expect(
      freeDeveloperProfileApp(devProfile({ days: 365, appId: 'XCS68MU4RC.com.x.paid' }))
    ).toBeNull();
    expect(
      freeDeveloperProfileApp(
        devProfile({ days: 7, appId: 'XCS68MU4RC.com.x.adhoc', taskAllow: false })
      )
    ).toBeNull();
    expect(freeDeveloperProfileApp(Buffer.from('not a profile'))).toBeNull();
  });
});

describe(freeProfileApps, () => {
  it('lists each app once, keeping the latest of its profiles, and skips the rest', () => {
    expect(
      freeProfileApps([
        devProfile({ days: 7, appId: 'XCS68MU4RC.com.x.entangle' }),
        devProfile({ days: 6, appId: 'XCS68MU4RC.com.x.calculator' }),
        devProfile({ days: 6, appId: 'XCS68MU4RC.com.x.entangle' }),
        devProfile({ days: 365, appId: 'XCS68MU4RC.com.x.paid' }),
        Buffer.from('not a profile'),
      ])
    ).toEqual([
      { bundleId: 'com.x.entangle', teamId: 'XCS68MU4RC', expiresAt: '2026-10-17T10:00:00.000Z' },
      { bundleId: 'com.x.calculator', teamId: 'XCS68MU4RC', expiresAt: '2026-10-16T10:00:00.000Z' },
    ]);
  });
});

const DEVICECTL =
  'ERROR: The maximum number of apps for free development profiles has been reached. ' +
  '(com.apple.dt.MobileDeviceErrorDomain error -402620383)';

// iOS lists application identifiers: the team id, a dot, then the bundle id.
const USBMUX =
  'This device has reached the maximum number of installed apps using a free developer profile: {(\n' +
  '    "XCS68MU4RC.com.gabrieldonadel.entangle-mobile.orbit07bcf83b",\n' +
  '    "XCS68MU4RC.com.petri.calculator.calculator.orbite9ad5650",\n' +
  '    "3VRHBFMBRL.com.gabrieldonadel.agentdevice.runner"\n' +
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
  it('lists the bundle ids from the usbmux wording without their team prefix', () => {
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
