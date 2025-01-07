import { IpcRendererEvent, ipcRenderer } from 'electron';
import type { EmitterSubscription } from 'react-native';

const FileHandler: {
  name: string;
  addListener(type: string, listener: (data: any) => void, context?: any): EmitterSubscription;
} = {
  name: 'FileHandler',
  addListener: (event: string, callback: (...args: string[]) => void, context) => {
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

export default FileHandler;
