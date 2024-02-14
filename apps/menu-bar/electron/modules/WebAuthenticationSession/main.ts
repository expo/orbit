import { BrowserWindow } from 'electron';

export enum WebBrowserResultType {
  CANCEL = 'cancel',
  SUCCESS = 'success',
}

export type WebBrowserResult =
  | {
      type: WebBrowserResultType.CANCEL;
    }
  | {
      type: WebBrowserResultType.SUCCESS;
      url: string;
    };

type WebAuthenticationSessionModuleType = {
  name: string;
  openAuthSessionAsync: (url: string) => Promise<WebBrowserResult>;
};

async function openAuthSessionAsync(urlString: string): Promise<WebBrowserResult> {
  const url = new URL(urlString);
  return new Promise((resolve, reject) => {
    const window = new BrowserWindow({
      width: 860,
      height: 740,
    });

    window.loadURL(urlString);

    window.webContents.on('will-redirect', (details) => {
      if (url.origin === new URL(details.url).origin) {
        return;
      }

      details.preventDefault();
      window.close();

      resolve({ type: WebBrowserResultType.SUCCESS, url: details.url });
    });

    window.on('closed', () => {
      resolve({ type: WebBrowserResultType.CANCEL });
    });

    window.webContents.on('render-process-gone', (event, details) => {
      reject(new Error(details.reason));
    });
  });
}

const WebAuthenticationSession: WebAuthenticationSessionModuleType = {
  name: 'WebAuthenticationSession',
  openAuthSessionAsync,
};

export default WebAuthenticationSession;
