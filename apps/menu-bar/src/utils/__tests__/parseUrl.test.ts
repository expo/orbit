import { URLType, identifyAndParseDeeplinkURL } from '../parseUrl';

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
    it('Should identiy expo.dev/artifacts URLs as Build URLs', () => {
      const artifactDeeplinkURL =
        'expo-orbit://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';

      expect(identifyAndParseDeeplinkURL(artifactDeeplinkURL)).toEqual({
        urlType: URLType.EXPO_BUILD,
        url: artifactDeeplinkURL.replace('expo-orbit://', 'https://'),
      });
    });

    it('Should parse url parameter from /download route', () => {
      const artifactURL = 'https://expo.dev/artifacts/eas/v3WshxGCF87UzsHSxfRnAh.tar.gz';
      const artifactDeeplinkURL = `expo-orbit:///download/?url=${encodeURIComponent(artifactURL)}`;

      expect(identifyAndParseDeeplinkURL(artifactDeeplinkURL)).toEqual({
        urlType: URLType.EXPO_BUILD,
        url: artifactURL,
      });
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
    it('Should identiy exp.host URLs as Snack URLs', () => {
      const snackDeeplinkURL = 'expo-orbit://exp.host/@gabrieldonadel/ec41d8+IH9vwTGYrg';

      expect(identifyAndParseDeeplinkURL(snackDeeplinkURL)).toEqual({
        urlType: URLType.SNACK,
        url: snackDeeplinkURL.replace('expo-orbit://', 'exp://'),
      });
    });

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

  describe('Unknown URLs', () => {
    it('Should identiy non-expo domains that are not using specific routes as Unknown URLs', () => {
      const unknownURL =
        'expo-orbit://github.com/expo/orbit/releases/download/expo-orbit-v1.0.2/expo-orbit.v1.0.2.zip';

      expect(identifyAndParseDeeplinkURL(unknownURL)).toEqual({
        urlType: URLType.UNKNOWN,
        url: unknownURL.replace('expo-orbit://', 'https://'),
      });
    });
  });
});
