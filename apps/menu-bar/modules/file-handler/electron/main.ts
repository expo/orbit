import { app, BrowserWindow } from 'electron';

import { isLikelyFilePath } from './isLikelyFilePath';

function sendOpenFile(url: string) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('onOpenFile', { path: url });
  }
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
