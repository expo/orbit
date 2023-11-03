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
