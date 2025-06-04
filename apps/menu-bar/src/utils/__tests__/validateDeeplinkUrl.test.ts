import { getUserPreferences } from '../../modules/Storage';
import { validateDeeplinkURL } from '../validateDeeplinkUrl';

jest.mock('../../modules/Storage', () => ({
  getUserPreferences: jest.fn(() => ({
    trustedSources: ['https://expo.dev/**'],
  })),
}));

describe('validateDeeplinkURL', () => {
  it('should return true if the url is trusted', () => {
    const url = 'https://expo.dev/example.apk';
    const result = validateDeeplinkURL(url);
    expect(result.isValid).toBe(true);
  });

  it('should return false if the url is not trusted', () => {
    const url = 'https://google.com/example.apk';
    const result = validateDeeplinkURL(url);
    expect(result.isValid).toBe(false);
  });

  it('should return true if the url is trusted and the trusted sources are empty', () => {
    jest.mocked(getUserPreferences).mockReturnValue({
      launchOnLogin: false,
      emulatorWithoutAudio: false,
      showIosSimulators: false,
      showTvosSimulators: false,
      showAndroidEmulators: false,
      trustedSources: undefined,
    });

    const url = 'https://expo.dev/example.apk';
    const result = validateDeeplinkURL(url);
    expect(result.isValid).toBe(true);
  });
});
