import { getUpdateDeeplink } from '../LaunchUpdate';

jest.mock('../../api/GraphqlClient', () => ({ graphqlSdk: {} }));
jest.mock('../DownloadBuild', () => ({ downloadBuildAsync: jest.fn() }));

const updateURL = 'https://u.expo.dev/update/addecbed-f477-4a75-bd88-0732dc928fe9';
const manifest = (sdkVersion?: string) =>
  ({
    id: 'addecbed-f477-4a75-bd88-0732dc928fe9',
    extra: { expoClient: { scheme: 'myapp', slug: 'my-app', sdkVersion } },
  }) as any;

describe('getUpdateDeeplink', () => {
  it('uses __expo_url for SDK 58 and later', () => {
    expect(getUpdateDeeplink(updateURL, manifest('58.0.0'))).toBe(
      'myapp://?__expo_url=https%3A%2F%2Fu.expo.dev%2Fupdate%2Faddecbed-f477-4a75-bd88-0732dc928fe9'
    );
  });

  it('keeps the legacy host for SDK 57 and unknown versions', () => {
    const legacy = `myapp://expo-development-client/?url=${updateURL}`;
    expect(getUpdateDeeplink(updateURL, manifest('57.0.0'))).toBe(legacy);
    expect(getUpdateDeeplink(updateURL, manifest(undefined))).toBe(legacy);
  });
});
