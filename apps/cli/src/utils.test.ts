import { trustedSourcesValidatorMiddleware } from './utils';
import { getTrustedSources } from './storage';

jest.mock('./storage', () => ({
  getTrustedSources: jest.fn(() => ['https://expo.io/**']),
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
    (getTrustedSources as jest.Mock).mockReturnValue(undefined);
    const fn = jest.fn();
    await trustedSourcesValidatorMiddleware(fn)('https://expo.io/test');
    expect(fn).toHaveBeenCalledWith('https://expo.io/test');
    expect(getTrustedSources).toHaveBeenCalled();
  });

  it('should not throw an error if the URL is from a trusted source', async () => {
    const fn = jest.fn();
    await trustedSourcesValidatorMiddleware(fn)('https://expo.io/test');
    expect(fn).toHaveBeenCalledWith('https://expo.io/test');
  });

  it('should throw an error if the URL is from an untrusted source', async () => {
    const fn = jest.fn();

    try {
      await trustedSourcesValidatorMiddleware(fn)('https://expo.io/test');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('This URL is from an untrusted source: https://expo.io/test');
      expect(fn).not.toHaveBeenCalled();
    }
  });
});
