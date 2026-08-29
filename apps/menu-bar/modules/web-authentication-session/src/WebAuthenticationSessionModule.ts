import { Linking } from 'react-native';

import {
  WebAuthenticationSessionModuleType,
  WebBrowserResult,
  WebBrowserResultType,
} from './WebAuthenticationSession.types';

async function openAuthSessionAsync(url: string): Promise<WebBrowserResult> {
  await Linking.openURL(url);

  return new Promise((resolve) => {
    const subscription = Linking.addEventListener('url', ({ url: callbackUrl }) => {
      const protocol = new URL(callbackUrl).protocol;
      if (protocol === 'https:' || protocol === 'http:') return;
      subscription.remove();
      resolve({ type: WebBrowserResultType.SUCCESS, url: callbackUrl });
    });
  });
}

export default {
  openAuthSessionAsync,
} as WebAuthenticationSessionModuleType;
