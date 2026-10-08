import fs from 'fs';
import os from 'os';
import path from 'path';

import { readEmbeddedProvisioningProfileAsync } from '../inspectApp';

// A .mobileprovision is a CMS blob with the XML plist inline; wrap a plist in
// junk bytes the way the real DER framing does.
function fakeProfile(plistBody: string): Buffer {
  const plist =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    `<plist version="1.0"><dict>${plistBody}</dict></plist>`;
  return Buffer.concat([
    Buffer.from([0x30, 0x82, 0x31, 0x7e, 0x06, 0x09, 0x2a, 0x86]),
    Buffer.from(plist),
    Buffer.from([0x31, 0x82, 0x0f, 0x00, 0x00, 0x00]),
  ]);
}

function appWithProfile(plistBody: string | null): string {
  const app = fs.mkdtempSync(path.join(os.tmpdir(), 'inspect-app-')) + '/Test.app';
  fs.mkdirSync(app);
  if (plistBody !== null) {
    fs.writeFileSync(path.join(app, 'embedded.mobileprovision'), fakeProfile(plistBody));
  }
  return app;
}

describe(readEmbeddedProvisioningProfileAsync, () => {
  it('reads an ad hoc profile out of the CMS blob', async () => {
    const app = appWithProfile(
      '<key>Name</key><string>*[expo] com.example AdHoc</string>' +
        '<key>TeamIdentifier</key><array><string>3VRHBFMBRL</string></array>' +
        '<key>ExpirationDate</key><date>2026-06-20T12:09:20Z</date>' +
        '<key>ProvisionedDevices</key><array><string>00008130-00084C910021401C</string></array>' +
        '<key>Entitlements</key><dict><key>get-task-allow</key><false/></dict>'
    );
    const profile = await readEmbeddedProvisioningProfileAsync(app);
    expect(profile).toEqual({
      name: '*[expo] com.example AdHoc',
      teamId: '3VRHBFMBRL',
      expiresAt: '2026-06-20T12:09:20.000Z',
      provisionsAllDevices: false,
      provisionedDevices: ['00008130-00084C910021401C'],
      kind: 'ad-hoc',
    });
  });

  it('classifies development, enterprise and App Store profiles', async () => {
    const dev = await readEmbeddedProvisioningProfileAsync(
      appWithProfile(
        '<key>ProvisionedDevices</key><array><string>X</string></array>' +
          '<key>Entitlements</key><dict><key>get-task-allow</key><true/></dict>'
      )
    );
    expect(dev?.kind).toBe('development');

    const enterprise = await readEmbeddedProvisioningProfileAsync(
      appWithProfile('<key>ProvisionsAllDevices</key><true/>')
    );
    expect(enterprise?.kind).toBe('enterprise');
    expect(enterprise?.provisionsAllDevices).toBe(true);

    const store = await readEmbeddedProvisioningProfileAsync(
      appWithProfile('<key>Entitlements</key><dict><key>beta-reports-active</key><true/></dict>')
    );
    expect(store?.kind).toBe('app-store');
    expect(store?.provisionedDevices).toBeUndefined();
  });

  it('returns undefined when the app has no embedded profile', async () => {
    expect(await readEmbeddedProvisioningProfileAsync(appWithProfile(null))).toBeUndefined();
  });
});
