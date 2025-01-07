import { app, BrowserWindow } from 'electron';

function sendOpenFile(url: string) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('onOpenFile', { path: url });
  }
}

function isLikelyFilePath(str: string) {
  // Check if the string contains slashes or backslashes (directory separators)
  const hasSlashes = str.includes('/') || str.includes('\\');

  // Check if the string ends with a file extension
  const hasFileExtension = /\.\w+$/.test(str);

  return hasSlashes && hasFileExtension;
}

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
