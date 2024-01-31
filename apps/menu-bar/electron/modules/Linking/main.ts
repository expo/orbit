import { shell, app, BrowserWindow, WebContents, ipcMain } from 'electron';
import { LinkingStatic } from 'react-native';

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
  if (typeof argv[argv.length - 1] === 'string') {
    sendOpenURL(argv[argv.length - 1]);
  }
});

async function getInitialURL() {
  return app.isPackaged ? process.argv[1] : process.argv[2];
}

async function openURL(url: string) {
  await shell.openExternal(url);
}

const Linking: Partial<LinkingStatic> & { name: string } = {
  name: 'Linking',
  openURL,
  getInitialURL,
};

export default Linking;
