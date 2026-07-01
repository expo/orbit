import { app, shell } from 'electron';

import {
  WebBrowserResult,
  WebBrowserResultType,
  WebAuthenticationSessionModuleType,
} from '../src/WebAuthenticationSession.types';

async function openAuthSessionAsync(urlString: string): Promise<WebBrowserResult> {
  await shell.openExternal(urlString);

  return new Promise((resolve) => {
    function cleanup() {
      app.removeListener('open-url', handleOpenUrl);
      app.removeListener('second-instance', handleSecondInstance);
    }

    function handleOpenUrl(_event: Electron.Event, url: string) {
      const protocol = new URL(url).protocol;
      if (protocol === 'https:' || protocol === 'http:') return;
      cleanup();
      resolve({ type: WebBrowserResultType.SUCCESS, url });
    }

    function handleSecondInstance(_event: Electron.Event, argv: string[]) {
      const url = argv[argv.length - 1];
      if (!url || !url.includes('://')) return;
      const protocol = new URL(url).protocol;
      if (protocol === 'https:' || protocol === 'http:') return;
      cleanup();
      resolve({ type: WebBrowserResultType.SUCCESS, url });
    }

    app.on('open-url', handleOpenUrl);
    app.on('second-instance', handleSecondInstance);
  });
}

const WebAuthenticationSession: WebAuthenticationSessionModuleType & { name: string } = {
  name: 'WebAuthenticationSession',
  openAuthSessionAsync,
};

export default WebAuthenticationSession;
