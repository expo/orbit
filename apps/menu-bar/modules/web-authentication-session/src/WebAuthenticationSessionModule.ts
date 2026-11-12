import {
  dismissAuthSession,
  openAuthSessionAsync as expoOpenAuthSessionAsync,
} from 'expo-web-browser';

import { WebAuthenticationSessionModuleType } from './WebAuthenticationSession.types';

const REDIRECT_URL = 'expo-orbit:///';
// The text of `WebBrowserAlreadyOpenException` in expo-web-browser.
const ALREADY_OPEN_MESSAGE = 'Another web browser is already open';

export default {
  openAuthSessionAsync: async (url: string) => {
    // A login that got no result from the system stays open, and a new login then fails with
    // the error above. So a new login first ends the old one.
    dismissAuthSession();
    try {
      return await expoOpenAuthSessionAsync(url, REDIRECT_URL);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes(ALREADY_OPEN_MESSAGE)) {
        throw error;
      }
      // The native code did not end the old login before it started the new one. End it
      // again, give it time, and try one more time.
      dismissAuthSession();
      await new Promise((resolve) => setTimeout(resolve, 250));
      return await expoOpenAuthSessionAsync(url, REDIRECT_URL);
    }
  },
} as WebAuthenticationSessionModuleType;
