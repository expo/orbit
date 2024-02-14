import { WebBrowserResultType } from './src/WebAuthenticationSession.types';
import WebAuthenticationSessionModule from './src/WebAuthenticationSessionModule';

export async function openAuthSessionAsync(url: string) {
  return await WebAuthenticationSessionModule.openAuthSessionAsync(url);
}

export { WebBrowserResultType };
