import { saveSessionSecret } from '../modules/Storage';

export const getPlatformFromURI = (url: string): 'android' | 'ios' => {
  return url.endsWith('.apk') ? 'android' : 'ios';
};

export function handleAuthUrl(url: string) {
  const resultURL = new URL(url);
  const sessionSecret = resultURL.searchParams.get('session_secret');

  if (!sessionSecret) {
    throw new Error('session_secret is missing in auth redirect query');
  }

  saveSessionSecret(sessionSecret);
}

export function identifyAndParseDeeplinkURL(deeplinkURL: string): {
  urlType: URLType;
  url: string;
} {
  const urlWithoutProtocol = deeplinkURL.replace(/^[^:]+:\/\//, '');

  if (urlWithoutProtocol.startsWith('auth?')) {
    return { urlType: URLType.AUTH, url: deeplinkURL };
  }
  if (urlWithoutProtocol.startsWith('update/')) {
    return {
      urlType: URLType.EXPO_UPDATE,
      url: `https://${urlWithoutProtocol.replace('update/', '')}`,
    };
  }
  if (
    urlWithoutProtocol.startsWith('expo.dev/artifacts') ||
    urlWithoutProtocol.startsWith('download/')
  ) {
    return {
      urlType: URLType.EXPO_BUILD,
      url: `https://${urlWithoutProtocol.replace('download/', '')}`,
    };
  }
  if (urlWithoutProtocol.includes('exp.host/') || urlWithoutProtocol.startsWith('snack/')) {
    return { urlType: URLType.SNACK, url: `exp://${urlWithoutProtocol.replace('snack/', '')}` };
  }

  // For future usage when we add support for other URL formats
  if (
    urlWithoutProtocol.indexOf('/') < urlWithoutProtocol.indexOf('.') ||
    !urlWithoutProtocol.includes('.')
  ) {
    throw new Error('Please make sure you are using the latest version of Expo Orbit.');
  }

  return { urlType: URLType.UNKNOWN, url: `https://${urlWithoutProtocol}` };
}

export enum URLType {
  AUTH,
  EXPO_UPDATE,
  EXPO_BUILD,
  SNACK,
  UNKNOWN,
}
