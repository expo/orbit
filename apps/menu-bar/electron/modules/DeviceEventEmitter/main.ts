import { BrowserWindow } from 'electron';

const DeviceEventEmitter = {
  name: 'DeviceEventEmitter',
  emit: (eventName: string, payload: unknown, _event?: Electron.IpcMainInvokeEvent) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(eventName, payload);
    }
  },
};

export default DeviceEventEmitter;
