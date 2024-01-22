import { BrowserWindow } from 'electron';

async function setPopoverSize(width: number, height: number, event: Electron.IpcMainInvokeEvent) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (event.sender === window.webContents) {
      window.setSize(width, height, true);
    }
  }
}

const AutoResizerRootViewManager: {
  name: string;
  setPopoverSize: (width: number, height: number, event: any) => void;
} = {
  name: 'AutoResizerRootViewManager',
  setPopoverSize,
};

export default AutoResizerRootViewManager;
