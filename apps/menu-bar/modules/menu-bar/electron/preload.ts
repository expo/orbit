import { ipcRenderer } from 'electron';

const MenuBarModule = {
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
};

export default MenuBarModule;
