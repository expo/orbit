import { getExpoGoUpdateDeeplink, getUpdateDeeplink } from '../commands/LaunchUpdate';
import { appendLaunchParams } from './launchUrl';

jest.mock('../storage', () => ({
  getCustomTrustedSources: jest.fn(() => []),
  getSessionSecret: jest.fn(() => undefined),
}));

describe(appendLaunchParams, () => {
  it('appends the launch token to a URL without a query', () => {
    expect(appendLaunchParams('exp://10.0.0.5:8081', { launchToken: 'abc' })).toBe(
      'exp://10.0.0.5:8081?__expo_launch_token=abc'
    );
  });

  it('appends the launch token to a URL with a query', () => {
    expect(
      appendLaunchParams('myapp://expo-development-client/?url=http%3A%2F%2F10.0.0.5%3A8081', {
        launchToken: 'abc',
      })
    ).toBe('myapp://expo-development-client/?url=http%3A%2F%2F10.0.0.5%3A8081&__expo_launch_token=abc');
  });

  it('percent-encodes the token', () => {
    expect(appendLaunchParams('exp://10.0.0.5:8081', { launchToken: 'a b&c=d' })).toBe(
      'exp://10.0.0.5:8081?__expo_launch_token=a%20b%26c%3Dd'
    );
  });

  it('returns the URL unchanged without a token', () => {
    expect(appendLaunchParams('exp://10.0.0.5:8081', {})).toBe('exp://10.0.0.5:8081');
    expect(appendLaunchParams('exp://10.0.0.5:8081', { launchToken: '' })).toBe(
      'exp://10.0.0.5:8081'
    );
  });
});

describe(getUpdateDeeplink, () => {
  const manifest = {
    id: 'update-id',
    extra: { expoClient: { scheme: 'myapp', slug: 'my-app' } },
  } as any;

  it('builds the legacy development client URL for an EAS Update permalink', () => {
    expect(getUpdateDeeplink('https://u.expo.dev/project-id/group/group-id', manifest)).toBe(
      'myapp://expo-development-client/?url=https://u.expo.dev/update/update-id'
    );
  });

  it('falls back to the exp+slug scheme', () => {
    const noScheme = { id: 'update-id', extra: { expoClient: { slug: 'my-app' } } } as any;
    expect(getUpdateDeeplink('https://example.com/manifest', noScheme)).toBe(
      'exp+my-app://expo-development-client/?url=https://example.com/manifest'
    );
  });

  it('uses the first scheme when the manifest lists several', () => {
    const many = {
      id: 'update-id',
      extra: { expoClient: { scheme: ['first', 'second'], slug: 'my-app' } },
    } as any;
    expect(getUpdateDeeplink('https://example.com/manifest', many)).toBe(
      'first://expo-development-client/?url=https://example.com/manifest'
    );
  });

  it('throws without a scheme or slug', () => {
    expect(() => getUpdateDeeplink('https://example.com/manifest', { id: 'x', extra: {} } as any)).toThrow(
      'Unable to resolve schema from manifest'
    );
  });
});

describe(getExpoGoUpdateDeeplink, () => {
  it('rewrites an EAS Update permalink to the exp scheme', () => {
    expect(
      getExpoGoUpdateDeeplink('https://u.expo.dev/project-id/group/group-id', { id: 'update-id' } as any)
    ).toBe('exp://u.expo.dev/update/update-id');
  });

  it('rewrites other https URLs to the exp scheme', () => {
    expect(getExpoGoUpdateDeeplink('https://example.com/manifest', { id: 'x' } as any)).toBe(
      'exp://example.com/manifest'
    );
  });
});
