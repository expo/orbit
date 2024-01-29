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

export function identifyAndParseDeeplinkURL(deeplinkURLString: string): {
  urlType: URLType;
  url: string;
} {
  /**
   * The URL implementation when running Jest does not support
   * custom schemes + URLs without domains. That's why we
   * default to http://expo.dev when creating a new URL instance.
   */
  const urlWithoutProtocol = deeplinkURLString.replace(/^[^:]+:\/\//, '');
  const deeplinkURL = new URL(deeplinkURLString, 'http://expo.dev');

  if (deeplinkURL.pathname.startsWith('/auth')) {
    return { urlType: URLType.AUTH, url: deeplinkURLString };
  }
  if (deeplinkURL.pathname.startsWith('/download')) {
    return {
      urlType: URLType.EXPO_BUILD,
      url: getUrlFromSearchParams(deeplinkURL.searchParams),
    };
  }
  if (deeplinkURL.pathname.startsWith('/snack')) {
    return {
      urlType: URLType.SNACK,
      url: getUrlFromSearchParams(deeplinkURL.searchParams),
    };
  }

  // Deprecated formats
  if (urlWithoutProtocol.startsWith('expo.dev/artifacts')) {
    return {
      urlType: URLType.EXPO_BUILD,
      url: `https://${urlWithoutProtocol}`,
    };
  }
  if (urlWithoutProtocol.includes('exp.host/')) {
    return {
      urlType: URLType.SNACK,
      url: `exp://${urlWithoutProtocol}`,
    };
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

function getUrlFromSearchParams(searchParams: URLSearchParams): string {
  const url = searchParams.get('url');
  if (!url) {
    throw new Error('Missing url parameter in query');
  }
  return url;
}

export enum URLType {
  AUTH = 'AUTH',
  EXPO_UPDATE = 'EXPO_UPDATE',
  EXPO_BUILD = 'EXPO_BUILD',
  SNACK = 'SNACK',
  UNKNOWN = 'UNKNOWN',
}
