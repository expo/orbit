import { IpcRendererEvent, ipcRenderer } from 'electron';
import type { DeviceEventEmitterStatic, EmitterSubscription } from 'react-native';

const DeviceEventEmitter: Partial<DeviceEventEmitterStatic> & { name: string } = {
  name: 'DeviceEventEmitter',
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

export default DeviceEventEmitter;
