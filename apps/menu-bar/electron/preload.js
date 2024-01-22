const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  MenuBarModule: {
    runCli: (command, args, listenerId) => ipcRenderer.invoke('runCli', command, args, listenerId),
  },
  addListener: (event, callback) => {
    ipcRenderer.on(event, (event, ...args) => {
      callback(...args);
    });
  },
});
