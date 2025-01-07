import { app, BrowserWindow, ipcMain, WebContents } from 'electron';

const openURLTargets = new WeakSet<WebContents>();

function sendOpenFile(url: string) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (openURLTargets.has(window.webContents)) {
      window.webContents.send('onOpenFile', url);
    }
  }
}

function isLikelyFilePath(str: string) {
  // Check if the string contains slashes or backslashes (directory separators)
  const hasSlashes = str.includes('/') || str.includes('\\');

  // Check if the string ends with a file extension
  const hasFileExtension = /\.\w+$/.test(str);

  return hasSlashes && hasFileExtension;
}

ipcMain.handle('register-onOpenFile-target', (event) => {
  openURLTargets.add(event.sender);
});
ipcMain.handle('unregister-onOpenFile-target', (event) => {
  openURLTargets.delete(event.sender);
});

app.on('second-instance', (_, argv) => {
  const lastArg = argv[argv.length - 1];
  if (typeof lastArg === 'string' && isLikelyFilePath(lastArg)) {
    sendOpenFile(lastArg);
  }
});

const FileHandler: {
  name: string;
} = {
  name: 'FileHandler',
};

export default FileHandler;
