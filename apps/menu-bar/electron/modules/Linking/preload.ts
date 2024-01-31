import { ipcRenderer } from 'electron';
import { EmitterSubscription, LinkingStatic } from 'react-native';

const eventHandlers = new Map<(event: { url: string }) => void, (event: { url: string }) => void>();

ipcRenderer.addListener('open-url', (_, url) => {
  for (const handler of eventHandlers.values()) {
    handler({ url });
  }
});

const addEventListener = (_: 'url', handler: (event: { url: string }) => void) => {
  if (eventHandlers.size === 0) {
    ipcRenderer.invoke('register-open-url-target');
  }
  eventHandlers.set(handler, handler);

  return {
    remove: () => {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        ipcRenderer.invoke('unregister-open-url-target');
      }
    },
  } as EmitterSubscription;
};

// Apply same behavior as react-native-web
const canOpenURL = (): Promise<boolean> => Promise.resolve(true);

const Linking: Partial<LinkingStatic> & { name: string } = {
  name: 'Linking',
  canOpenURL,
  addEventListener,
};

export default Linking;
