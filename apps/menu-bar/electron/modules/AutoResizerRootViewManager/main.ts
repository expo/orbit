import { BrowserWindow, screen } from 'electron';

async function setPopoverSize(width: number, height: number, event: Electron.IpcMainInvokeEvent) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (event.sender === window.webContents) {
      const [oldX, oldY] = window.getPosition();
      const [oldWidth, oldHeight] = window.getSize();

      const display = screen.getDisplayNearestPoint({ x: oldX, y: oldY });

      window.setBounds(
        {
          width,
          height,
          x: oldX + oldWidth - width,
          y: display.size.height / 2 > oldY ? oldY : oldY + oldHeight - height,
        },
        true
      );
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
