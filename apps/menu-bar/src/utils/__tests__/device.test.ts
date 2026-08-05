import { Devices } from 'common-types';

import { DevicesPerPlatform, getSectionsFromDeviceList } from '../device';

function createDevicesPerPlatform(overrides: Partial<DevicesPerPlatform> = {}): DevicesPerPlatform {
  return {
    android: { devices: new Map() },
    ios: { devices: new Map() },
    tvos: { devices: new Map() },
    watchos: { devices: new Map() },
    ...overrides,
  } as DevicesPerPlatform;
}

const iosSimulator = {
  udid: 'sim-1',
  name: 'iPhone 17',
  osType: 'iOS',
  deviceType: 'simulator',
  state: 'Shutdown',
  runtime: 'iOS-26-0',
  osVersion: '26.0',
  windowName: 'iPhone 17',
  isAvailable: true,
} as Devices.IosSimulator;

describe('getSectionsFromDeviceList', () => {
  it('hides empty sections by default', () => {
    const sections = getSectionsFromDeviceList(createDevicesPerPlatform());
    expect(sections).toHaveLength(0);
  });

  it('shows a section that has devices', () => {
    const sections = getSectionsFromDeviceList(
      createDevicesPerPlatform({
        ios: { devices: new Map([['sim-1', iosSimulator]]) },
      })
    );

    expect(sections.map((section) => section.key)).toEqual(['ios']);
  });

  it('keeps Android visible so its pairing "+" stays reachable', () => {
    const sections = getSectionsFromDeviceList(createDevicesPerPlatform(), {
      alwaysShowAndroid: true,
    });

    expect(sections.map((section) => section.key)).toEqual(['android']);
  });

  /**
   * Windows and Linux list no local iOS simulators at all, so without this the
   * iOS header — and the cloud simulator "+" on it — would never render there.
   */
  it('keeps iOS visible for the cloud simulator entry point', () => {
    const sections = getSectionsFromDeviceList(createDevicesPerPlatform(), {
      alwaysShowIos: true,
    });

    expect(sections.map((section) => section.key)).toEqual(['ios']);
  });

  it('does not show iOS when cloud simulators are off', () => {
    const sections = getSectionsFromDeviceList(createDevicesPerPlatform(), {
      alwaysShowIos: false,
    });

    expect(sections).toHaveLength(0);
  });

  it('still shows a section that only has an error', () => {
    const sections = getSectionsFromDeviceList(
      createDevicesPerPlatform({
        ios: {
          devices: new Map(),
          error: { code: 'APPLE_DEVICE_USBMUXD_NOT_RUNNING', message: 'iTunes is not running' },
        },
      })
    );

    expect(sections.map((section) => section.key)).toEqual(['ios']);
  });
});
