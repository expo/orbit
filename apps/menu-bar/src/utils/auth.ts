import { Config } from 'common-types';

import {
  openAuthSessionAsync,
  WebBrowserResultType,
} from '../../modules/web-authentication-session';
import { saveSessionSecret } from '../modules/Storage';

/** Opens the Expo login or sign-up page and saves the session it returns. */
export async function authenticateAsync(type: 'signup' | 'login') {
  const redirectBase = 'expo-orbit:///auth';
  const authSessionURL = `${
    Config.website.origin
  }/${type}?confirm_account=1&app_redirect_uri=${encodeURIComponent(redirectBase)}`;
  const result = await openAuthSessionAsync(authSessionURL);

  if (result.type === WebBrowserResultType.SUCCESS) {
    const resultURL = new URL(result.url);
    const sessionSecret = resultURL.searchParams.get('session_secret');

    if (!sessionSecret) {
      throw new Error('session_secret is missing in auth redirect query');
    }

    saveSessionSecret(sessionSecret);
  }
}
