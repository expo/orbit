import { shell, app, BrowserWindow, WebContents, ipcMain } from 'electron';
import { LinkingImpl } from 'react-native';

const openURLTargets = new WeakSet<WebContents>();

function sendOpenURL(url: string) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (openURLTargets.has(window.webContents)) {
      window.webContents.send('open-url', url);
    }
  }
}

ipcMain.handle('register-open-url-target', (event) => {
  openURLTargets.add(event.sender);
});
ipcMain.handle('unregister-open-url-target', (event) => {
  openURLTargets.delete(event.sender);
});

app.on('open-url', (_, url) => {
  sendOpenURL(url);
});

app.on('second-instance', (_, argv) => {
  const lastArg = argv[argv.length - 1];
  if (typeof lastArg === 'string' && lastArg.includes('://')) {
    sendOpenURL(lastArg);
  }
});

async function getInitialURL() {
  const lastArg = process.argv[process.argv.length - 1];
  if (typeof lastArg === 'string' && lastArg.includes('://')) {
    return lastArg;
  }

  return undefined;
}

async function openURL(url: string) {
  await shell.openExternal(url);
}

const Linking: Partial<LinkingImpl> & { name: string } = {
  name: 'Linking',
  openURL,
  getInitialURL,
};

export default Linking;
