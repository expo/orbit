import { openAuthSessionAsync as expoOpenAuthSessionAsync } from 'expo-web-browser';

import { WebAuthenticationSessionModuleType } from './WebAuthenticationSession.types';

export default {
  openAuthSessionAsync: (url: string) => expoOpenAuthSessionAsync(url, 'expo-orbit:///'),
} as WebAuthenticationSessionModuleType;
