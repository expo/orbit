import { isApkArtifactUrl } from '../download';

describe('isApkArtifactUrl', () => {
  // The helper decides APK-ness from the URL pathname only, so signed
  // distribution URLs (which carry `?Signature=…` query strings, and may also
  // carry a `#fragment`) are detected as APKs instead of being misrouted into
  // the tarball-extract branch.
  it.each<[label: string, input: string, expected: boolean]>([
    ['plain APK URL', 'https://host/path/build.apk', true],
    [
      'signed APK URL with a query string',
      'https://host/path/build.apk?Policy=abc&Signature=xyz&Key-Pair-Id=id',
      true,
    ],
    ['APK URL with a fragment', 'https://host/path/build.apk#section', true],
    ['uppercase .APK extension', 'https://host/path/build.APK', true],
    ['signed + uppercase .APK', 'https://host/path/build.APK?token=1', true],
    ['APK URL with query and fragment', 'https://host/path/build.apk?Policy=abc#section', true],
    ['iOS tar.gz archive', 'https://host/path/build.tar.gz', false],
    ['signed iOS tar.gz archive', 'https://host/path/build.tar.gz?Policy=abc', false],
    ['IPA archive', 'https://host/path/build.ipa', false],
    ['.xapk is not an .apk', 'https://host/path/build.xapk', false],
    ['.apk inside a directory segment', 'https://host/path/dir.apk/build.tar.gz?sig=1', false],
    ['trailing suffix after .apk', 'https://host/path/my.apk.backup?sig=1', false],
  ])('%s', (_label, input, expected) => {
    expect(isApkArtifactUrl(input)).toBe(expected);
  });
});
