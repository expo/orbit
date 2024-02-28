const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('autoUpdater', {
  skipVersion: () => ipcRenderer.invoke('autoUpdater:skipVersion'),
  installUpdate: () => ipcRenderer.invoke('autoUpdater:installUpdate'),
  rememberLater: () => ipcRenderer.invoke('autoUpdater:rememberLater'),
  receiveInfo: (info) => {
    ipcRenderer.on('autoUpdater:sendInfo', info);
  },
});
