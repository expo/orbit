import { BrowserWindow } from 'electron';

import {
  WebBrowserResult,
  WebBrowserResultType,
  WebAuthenticationSessionModuleType,
} from '../src/WebAuthenticationSession.types';

async function openAuthSessionAsync(urlString: string): Promise<WebBrowserResult> {
  const url = new URL(urlString);
  const window = new BrowserWindow({
    width: 860,
    height: 740,
  });
  window.menuBarVisible = false;
  window.loadURL(urlString);

  return new Promise((resolve, reject) => {
    function handleRedirect(
      event: Electron.Event<
        Electron.WebContentsWillRedirectEventParams | Electron.WebContentsWillNavigateEventParams
      >
    ) {
      if (event.isSameDocument || url.origin === new URL(event.url).origin) {
        return;
      }

      event.preventDefault();
      window.close();

      resolve({ type: WebBrowserResultType.SUCCESS, url: event.url });
    }

    window.webContents.on('will-redirect', handleRedirect);
    window.webContents.on('will-navigate', handleRedirect);

    window.on('closed', () => {
      resolve({ type: WebBrowserResultType.CANCEL });
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
