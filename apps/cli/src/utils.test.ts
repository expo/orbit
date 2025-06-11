import { trustedSourcesValidatorMiddleware } from './commands/TrustedSources';
import { getCustomTrustedSources } from './storage';

jest.mock('./storage', () => ({
  getTrustedSources: jest.fn(() => ['https://expo.dev/**']),
}));

describe('trustedSourcesValidatorMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the result of the function if no URLs are provided', async () => {
    const fn = jest.fn();
    await trustedSourcesValidatorMiddleware(fn)('test');
    expect(fn).toHaveBeenCalledWith('test');
  });

  it('should not throw if there are no trusted sources', async () => {
    (getCustomTrustedSources as jest.Mock).mockReturnValue(undefined);
    const fn = jest.fn();
    await trustedSourcesValidatorMiddleware(fn)('https://expo.dev/test');
    expect(fn).toHaveBeenCalledWith('https://expo.dev/test');
    expect(getCustomTrustedSources).toHaveBeenCalled();
  });

  it('should not throw an error if the URL is from a trusted source', async () => {
    const fn = jest.fn();
    await trustedSourcesValidatorMiddleware(fn)('https://expo.dev/test');
    expect(fn).toHaveBeenCalledWith('https://expo.dev/test');
  });

  it('should throw an error if the URL is from an untrusted source', async () => {
    const fn = jest.fn();

    try {
      await trustedSourcesValidatorMiddleware(fn)('https://expo.dev/test');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('This URL is from an untrusted source: https://expo.dev/test');
      expect(fn).not.toHaveBeenCalled();
    }
  });
});
