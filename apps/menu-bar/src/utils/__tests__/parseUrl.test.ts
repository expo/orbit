import { DowndloadDeeplinkURLType, URLType, identifyAndParseDeeplinkURL } from '../parseUrl';

jest.mock('../../modules/Storage', () => ({
  saveSessionSecret: jest.fn(),
}));

describe('identifyAndParseDeeplinkURL', () => {
  describe('Auth URLs', () => {
    it('should support Auth callback URL from expo.dev', () => {
      const authCallbackURL =
        'expo-orbit:///auth?username_or_email=gabrieldonadel&session_secret=%7B%22id%22%3A%22XXXXXXXX-XXXX-XXXX-XXXXX-XXXXXXXXXXXX%22%2C%22version%22%3A1%2C%22expires_at%22%3A0000000000000%7D';

      expect(identifyAndParseDeeplinkURL(authCallbackURL)).toEqual({
        urlType: URLType.AUTH,
        url: authCallbackURL,
      });
    });
  });

  describe('Build URLs', () => {
    it('Should parse url parameter from /download route', () => {
      const artifactURL = 'https://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';
      const artifactDeeplinkURL = `expo-orbit:///download/?url=${encodeURIComponent(artifactURL)}`;

      expect(identifyAndParseDeeplinkURL(artifactDeeplinkURL)).toEqual({
        urlType: URLType.EXPO_BUILD,
        url: artifactURL,
      });
    });

    it('Should parse launchURL parameter from /download route', () => {
      const artifactURL = 'https://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';
      const launchURL = 'myapp://expo-development-client/?url=http://localhost:8081';
      const artifactDeeplinkURL = `expo-orbit:///download/?url=${encodeURIComponent(artifactURL)}&launchURL=${encodeURIComponent(launchURL)}`;

      expect(identifyAndParseDeeplinkURL(artifactDeeplinkURL)).toEqual({
        urlType: URLType.EXPO_BUILD,
        url: artifactURL,
        launchURL,
      });
    });

    it('Should return undefined launchURL when not provided in /download route', () => {
      const artifactURL = 'https://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';
      const artifactDeeplinkURL = `expo-orbit:///download/?url=${encodeURIComponent(artifactURL)}`;

      const result = identifyAndParseDeeplinkURL(artifactDeeplinkURL) as DowndloadDeeplinkURLType;

      expect(result.launchURL).toBeUndefined();
    });
  });

  describe('Update URLs', () => {
    it('Should parse url parameter from /update route', () => {
      const updateURL = 'https://u.expo.dev/update/addecbed-f477-4a75-bd88-0732dc928fe9';
      const updateDeeplinkURL = `expo-orbit:///update?url=${encodeURIComponent(updateURL)}`;

      expect(identifyAndParseDeeplinkURL(updateDeeplinkURL)).toEqual({
        urlType: URLType.EXPO_UPDATE,
        url: updateURL,
      });
    });

    it('Should throw if url parameter is not present', () => {
      const updateDeeplinkURL = `expo-orbit:///update`;

      expect(() => identifyAndParseDeeplinkURL(updateDeeplinkURL)).toThrowError();
    });
  });

  describe('Expo GO URLs', () => {
    it('Should parse url parameter from /go route', () => {
      const url =
        'exp://staging-u.expo.dev/2dce2748-c51f-4865-bae0-392af794d60a?runtime-version=exposdk%3A50.0.0&channel-name=production&snack-channel=Hhhqw6NhFw';
      const deeplinkURL = `expo-orbit:///go?url=${encodeURIComponent(url)}`;

      expect(identifyAndParseDeeplinkURL(deeplinkURL)).toEqual({
        urlType: URLType.GO,
        url,
        sdkVersion: null,
      });
    });

    it('Should parse sdkVersion parameter from /go route', () => {
      const sdkVersion = '50.0.0';
      const url =
        'exp://staging-u.expo.dev/2dce2748-c51f-4865-bae0-392af794d60a?runtime-version=exposdk%3A50.0.0&channel-name=production&snack-channel=Hhhqw6NhFw';
      const deeplinkURL = `expo-orbit:///go?url=${encodeURIComponent(url)}&sdkVersion=${sdkVersion}`;

      expect(identifyAndParseDeeplinkURL(deeplinkURL)).toEqual({
        urlType: URLType.GO,
        url,
        sdkVersion,
      });
    });
  });

  describe('Snack URLs', () => {
    it('Should parse url parameter from /snack route', () => {
      const snackURL =
        'exp://staging-u.expo.dev/2dce2748-c51f-4865-bae0-392af794d60a?runtime-version=exposdk%3A50.0.0&channel-name=production&snack-channel=Hhhqw6NhFw';
      const snackDeeplinkURL = `expo-orbit:///snack?url=${encodeURIComponent(snackURL)}`;

      expect(identifyAndParseDeeplinkURL(snackDeeplinkURL)).toEqual({
        urlType: URLType.SNACK,
        url: snackURL,
      });
    });
  });

  describe('No leading / URLs', () => {
    it('Should parse url parameter from /download route', () => {
      const artifactURL = 'https://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';
      const artifactDeeplinkURL = `expo-orbit://download/?url=${encodeURIComponent(artifactURL)}`;

      expect(identifyAndParseDeeplinkURL(artifactDeeplinkURL)).toEqual({
        urlType: URLType.EXPO_BUILD,
        url: artifactURL,
      });
    });

    it('Should parse launchURL parameter from /download route without leading slash', () => {
      const artifactURL = 'https://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';
      const launchURL = 'myapp://expo-development-client/?url=http://localhost:8081';
      const artifactDeeplinkURL = `expo-orbit://download/?url=${encodeURIComponent(artifactURL)}&launchURL=${encodeURIComponent(launchURL)}`;

      expect(identifyAndParseDeeplinkURL(artifactDeeplinkURL)).toEqual({
        urlType: URLType.EXPO_BUILD,
        url: artifactURL,
        launchURL,
      });
    });

    it('Should parse url parameter from /update route', () => {
      const updateURL = 'https://u.expo.dev/update/addecbed-f477-4a75-bd88-0732dc928fe9';
      const updateDeeplinkURL = `expo-orbit://update?url=${encodeURIComponent(updateURL)}`;

      expect(identifyAndParseDeeplinkURL(updateDeeplinkURL)).toEqual({
        urlType: URLType.EXPO_UPDATE,
        url: updateURL,
      });
    });
  });

  describe('Unsuported URLs', () => {
    it('Should throw an error when the URL route is not supported', () => {
      const unsuportedURL = 'expo-orbit:///some-future-route';

      expect(() => identifyAndParseDeeplinkURL(unsuportedURL)).toThrowError();
    });

    it('Should throw an error when the URL is invalid', () => {
      const unsuportedURL = '::::?///aklsdmalksjdaoijoeqw';

      expect(() => identifyAndParseDeeplinkURL(unsuportedURL)).toThrowError();
    });
  });

  describe('Universal Link URLs (orbit.expo.dev and expo-orbit.expo.app)', () => {
    it('Should parse /download from orbit.expo.dev universal link', () => {
      const artifactURL = 'https://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';
      const universalLink = `https://orbit.expo.dev/download?url=${encodeURIComponent(artifactURL)}`;

      expect(identifyAndParseDeeplinkURL(universalLink)).toEqual({
        urlType: URLType.EXPO_BUILD,
        url: artifactURL,
      });
    });

    it('Should parse /update from orbit.expo.dev universal link', () => {
      const updateURL = 'https://u.expo.dev/update/addecbed-f477-4a75-bd88-0732dc928fe9';
      const universalLink = `https://orbit.expo.dev/update?url=${encodeURIComponent(updateURL)}`;

      expect(identifyAndParseDeeplinkURL(universalLink)).toEqual({
        urlType: URLType.EXPO_UPDATE,
        url: updateURL,
      });
    });

    it('Should parse /go from orbit.expo.dev universal link', () => {
      const url =
        'exp://staging-u.expo.dev/2dce2748-c51f-4865-bae0-392af794d60a?runtime-version=exposdk%3A50.0.0&channel-name=production';
      const universalLink = `https://orbit.expo.dev/go?url=${encodeURIComponent(url)}`;

      expect(identifyAndParseDeeplinkURL(universalLink)).toEqual({
        urlType: URLType.GO,
        url,
        sdkVersion: null,
      });
    });

    it('Should parse /auth from orbit.expo.dev universal link', () => {
      const universalLink =
        'https://orbit.expo.dev/auth?username_or_email=user&session_secret=secret';

      expect(identifyAndParseDeeplinkURL(universalLink)).toEqual({
        urlType: URLType.AUTH,
        url: universalLink,
      });
    });

    it('Should parse /download from expo-orbit.expo.app universal link', () => {
      const artifactURL = 'https://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';
      const universalLink = `https://expo-orbit.expo.app/download?url=${encodeURIComponent(artifactURL)}`;

      expect(identifyAndParseDeeplinkURL(universalLink)).toEqual({
        urlType: URLType.EXPO_BUILD,
        url: artifactURL,
      });
    });

    it('Should parse /update from expo-orbit.expo.app universal link', () => {
      const updateURL = 'https://u.expo.dev/update/addecbed-f477-4a75-bd88-0732dc928fe9';
      const universalLink = `https://expo-orbit.expo.app/update?url=${encodeURIComponent(updateURL)}`;

      expect(identifyAndParseDeeplinkURL(universalLink)).toEqual({
        urlType: URLType.EXPO_UPDATE,
        url: updateURL,
      });
    });
  });

  describe('Unknown URLs', () => {
    it('Should throw for non-expo domains that are not using specific routes', () => {
      const unknownURL =
        'expo-orbit://github.com/expo/orbit/releases/download/expo-orbit-v1.0.2/expo-orbit.v1.0.2.zip';

      expect(() => identifyAndParseDeeplinkURL(unknownURL)).toThrow('Unsupported URL');
    });
  });
});
