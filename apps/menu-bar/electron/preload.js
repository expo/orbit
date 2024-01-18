const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  MenuBarModule: {
    runCli: (command, args) => ipcRenderer.invoke('runCli', command, args),
  },
  addListener: (event, callback) => {
    ipcRenderer.on(event, callback);
  },
});
