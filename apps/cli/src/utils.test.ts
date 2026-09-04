import { trustedSourcesValidatorMiddleware } from './commands/TrustedSources';
import { getCustomTrustedSources } from './storage';

jest.mock('./storage', () => ({
  getCustomTrustedSources: jest.fn(() => []),
}));

describe('trustedSourcesValidatorMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCustomTrustedSources as jest.Mock).mockReturnValue([]);
  });

  it('should throw for a URL that matches no trusted source', async () => {
    const fn = jest.fn();
    await expect(
      trustedSourcesValidatorMiddleware(fn)('https://malicious.example/app.ipa')
    ).rejects.toThrow('This URL is from an untrusted source: https://malicious.example/app.ipa');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should not throw if there are no custom trusted sources', async () => {
    const fn = jest.fn();
    await trustedSourcesValidatorMiddleware(fn)('https://expo.dev/test');
    expect(fn).toHaveBeenCalledWith('https://expo.dev/test');
    expect(getCustomTrustedSources).toHaveBeenCalled();
  });

  it('should not throw an error if the URL is from a default trusted source', async () => {
    const fn = jest.fn();
    await trustedSourcesValidatorMiddleware(fn)('https://staging.expo.dev/test');
    expect(fn).toHaveBeenCalledWith('https://staging.expo.dev/test');
  });

  it('should allow URLs matching a custom trusted source', async () => {
    (getCustomTrustedSources as jest.Mock).mockReturnValue(['https://internal.example/**']);
    const fn = jest.fn();
    await trustedSourcesValidatorMiddleware(fn)('https://internal.example/builds/app.ipa');
    expect(fn).toHaveBeenCalledWith('https://internal.example/builds/app.ipa');
  });
});
