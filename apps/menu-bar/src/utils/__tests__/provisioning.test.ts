import { describeResignReason, resignReasonForDevice } from '../provisioning';

const UDID = '00008130-00084C910021401C';
const NOW = new Date('2026-10-08T12:00:00Z');

const adHoc = {
  kind: 'ad-hoc' as const,
  expiresAt: '2027-01-01T00:00:00Z',
  provisionsAllDevices: false,
  provisionedDevices: [UDID, '00008140-001611D11AF0801C'],
};

describe(resignReasonForDevice, () => {
  it('accepts a current profile that lists the device', () => {
    expect(resignReasonForDevice(adHoc, UDID, NOW)).toBeNull();
    // UDID case must not matter.
    expect(resignReasonForDevice(adHoc, UDID.toLowerCase(), NOW)).toBeNull();
  });

  it('flags an expired profile even when the device is listed', () => {
    // The entangle case: Ad Hoc, device listed, expired months ago.
    expect(resignReasonForDevice({ ...adHoc, expiresAt: '2026-06-20T12:09:20Z' }, UDID, NOW)).toBe(
      'expired'
    );
  });

  it('flags a device missing from the profile', () => {
    expect(resignReasonForDevice(adHoc, '00008999-000000000000001C', NOW)).toBe(
      'device-not-provisioned'
    );
  });

  it('accepts enterprise profiles for any device', () => {
    expect(
      resignReasonForDevice(
        { kind: 'enterprise', provisionsAllDevices: true, expiresAt: '2027-01-01T00:00:00Z' },
        'anything',
        NOW
      )
    ).toBeNull();
  });

  it('always flags App Store / TestFlight profiles', () => {
    expect(
      resignReasonForDevice(
        { kind: 'app-store', provisionsAllDevices: false, expiresAt: '2027-01-01T00:00:00Z' },
        UDID,
        NOW
      )
    ).toBe('app-store');
  });
});

describe(describeResignReason, () => {
  it('names the device and offers the resign', () => {
    const copy = describeResignReason('device-not-provisioned', { deviceName: 'Gabriel’s iPhone' });
    expect(copy.title).toContain('Gabriel’s iPhone');
    expect(copy.message).toMatch(/resign it with your Apple ID/);
  });
});
