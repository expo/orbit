import { trustedSourcesValidatorMiddleware } from './commands/TrustedSources';
import { getCustomTrustedSources } from './storage';

// `TrustedSources` imports `getCustomTrustedSources`, not `getTrustedSources`. The mock named the
// wrong export, so the suite exercised an undefined function — masked until now because the suite
// never compiled.
jest.mock('./storage', () => ({
  getCustomTrustedSources: jest.fn(() => ['https://expo.dev/**']),
}));

describe('trustedSourcesValidatorMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // `clearAllMocks` clears calls but keeps implementations, so the `mockReturnValue(undefined)`
    // below would otherwise leak into every later test. Restore the default each time.
    (getCustomTrustedSources as jest.Mock).mockReturnValue(['https://expo.dev/**']);
  });

  it('should reject a value that is not a URL at all', async () => {
    // The gate is fail-closed: the first argument is always matched against the trusted sources,
    // so a bare string matches nothing and never reaches the command.
    const fn = jest.fn();

    await expect(trustedSourcesValidatorMiddleware(fn)('test')).rejects.toThrow(
      'This URL is from an untrusted source: test'
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it('should not throw if there are no custom trusted sources', async () => {
    // `getCustomTrustedSources` is typed `string[]` and returns `|| []`, so the empty array is the
    // real "nothing configured" case. The built-in defaults still have to apply.
    (getCustomTrustedSources as jest.Mock).mockReturnValue([]);
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
    // Previously this used a *trusted* URL inside a try/catch, so the catch never ran and none of
    // its assertions were reached — the test passed without checking anything.
    const fn = jest.fn();

    await expect(
      trustedSourcesValidatorMiddleware(fn)('https://evil.example.com/app.apk')
    ).rejects.toMatchObject({
      code: 'UNTRUSTED_SOURCE',
      message: 'This URL is from an untrusted source: https://evil.example.com/app.apk',
    });
    expect(fn).not.toHaveBeenCalled();
  });
});
