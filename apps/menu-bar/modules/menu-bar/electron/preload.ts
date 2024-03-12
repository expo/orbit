import { IpcRendererEvent, ipcRenderer } from 'electron';
import { EmitterSubscription } from 'react-native';

import { ElectronPreloadMenuBarModule } from '../src/types';

const MenuBarModule: ElectronPreloadMenuBarModule = {
  name: 'MenuBar',
  initialScreenSize: {
    height: globalThis.screen?.height || 0,
    width: globalThis.screen?.width || 0,
  },
  openPopover: () => {
    ipcRenderer.invoke('open-popover');
  },
  closePopover: () => {
    ipcRenderer.invoke('close-popover');
  },
  addListener: (event: string, callback: (...args: string[]) => void) => {
    const listener = (event: IpcRendererEvent, ...args: any[]) => {
      callback(...args);
    };
    ipcRenderer.on(event, listener);

    return {
      remove: () => {
        ipcRenderer.removeListener(event, listener);
      },
    } as EmitterSubscription;
  },
};

export default MenuBarModule;
