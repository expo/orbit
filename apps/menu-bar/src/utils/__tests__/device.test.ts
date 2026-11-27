import { DevicesPerPlatform, getSectionsFromDeviceList } from '../device';

const noDevices = (): DevicesPerPlatform => ({
  android: { devices: new Map() },
  ios: { devices: new Map() },
  tvos: { devices: new Map() },
  watchos: { devices: new Map() },
});

describe('getSectionsFromDeviceList', () => {
  it('keeps an empty iOS section when the CLI can pair an iPhone over Wi-Fi', () => {
    expect(getSectionsFromDeviceList(noDevices())).toEqual([]);

    const devices = noDevices();
    devices.ios.canPairOverWifi = true;
    expect(getSectionsFromDeviceList(devices).map(({ key }) => key)).toEqual(['ios']);
  });
});
