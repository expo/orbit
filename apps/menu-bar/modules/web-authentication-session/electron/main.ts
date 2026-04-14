import { BrowserWindow } from 'electron';

import {
  WebBrowserResult,
  WebBrowserResultType,
  WebAuthenticationSessionModuleType,
} from '../src/WebAuthenticationSession.types';

async function openAuthSessionAsync(urlString: string): Promise<WebBrowserResult> {
  const window = new BrowserWindow({
    width: 860,
    height: 740,
  });
  window.menuBarVisible = false;
  window.loadURL(urlString);

  return new Promise((resolve, reject) => {
    let resolved = false;

    function completeWithSuccess(resultUrl: string) {
      if (resolved) return;
      resolved = true;
      window.close();
      resolve({ type: WebBrowserResultType.SUCCESS, url: resultUrl });
    }

    function handleRedirect(
      event: Electron.Event<
        Electron.WebContentsWillRedirectEventParams | Electron.WebContentsWillNavigateEventParams
      >
    ) {
      if (event.isSameDocument) {
        return;
      }

      const redirectProtocol = new URL(event.url).protocol;
      if (redirectProtocol === 'https:' || redirectProtocol === 'http:') {
        return;
      }

      event.preventDefault();
      completeWithSuccess(event.url);
    }

    window.webContents.on('will-redirect', handleRedirect);
    window.webContents.on('will-navigate', handleRedirect);

    // Allow OAuth provider popups (e.g. Google sign-in) and monitor them for redirects
    window.webContents.setWindowOpenHandler(() => ({ action: 'allow' }));
    window.webContents.on('did-create-window', (childWindow) => {
      childWindow.webContents.on('will-redirect', handleRedirect);
      childWindow.webContents.on('will-navigate', handleRedirect);
    });

    window.on('closed', () => {
      if (!resolved) {
        resolved = true;
        resolve({ type: WebBrowserResultType.CANCEL });
      }
    });

    window.webContents.on('render-process-gone', (event, details) => {
      reject(new Error(details.reason));
    });
  });
}

const WebAuthenticationSession: WebAuthenticationSessionModuleType & { name: string } = {
  name: 'WebAuthenticationSession',
  openAuthSessionAsync,
};

export default WebAuthenticationSession;
