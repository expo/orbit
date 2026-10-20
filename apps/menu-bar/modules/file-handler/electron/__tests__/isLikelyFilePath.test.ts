import { isLikelyFilePath } from '../isLikelyFilePath';

describe('isLikelyFilePath', () => {
  it('accepts local file paths', () => {
    expect(isLikelyFilePath('C:\\Users\\me\\Downloads\\app.apk')).toBe(true);
    expect(isLikelyFilePath('/home/me/Downloads/app.tar.gz')).toBe(true);
  });

  it('rejects paths without a directory separator or extension', () => {
    expect(isLikelyFilePath('app.apk')).toBe(false);
    expect(isLikelyFilePath('C:\\Users\\me\\Downloads')).toBe(false);
  });

  it('rejects deep links that end with a file extension', () => {
    expect(
      isLikelyFilePath(
        'expo-orbit:///download?url=https%3A%2F%2Fexpo.dev%2Fartifacts%2Feas%2Fabc123.apk'
      )
    ).toBe(false);
    expect(isLikelyFilePath('expo-orbit://download?url=https://expo.dev/a/b.apk')).toBe(false);
    expect(isLikelyFilePath('https://expo.dev/artifacts/eas/abc123.apk')).toBe(false);
  });
});
