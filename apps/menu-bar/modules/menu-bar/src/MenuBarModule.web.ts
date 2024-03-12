import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

import { ElectronMainMenuBarModule, ElectronPreloadMenuBarModule } from './types';

const MenuBar = requireElectronModule<ElectronMainMenuBarModule & ElectronPreloadMenuBarModule>(
  'MenuBar'
);

class EventEmitter {
  addListener<T>(eventName: string, listener: (event: T) => void) {
    return MenuBar.addListener(eventName, listener);
  }
}
export const emitter = new EventEmitter();

export default {
  ...MenuBar,
  async runCli(...args) {
    try {
      return await MenuBar.runCli(...args);
    } catch (error) {
      if (error instanceof Error) {
        /**
         * Electron adds a prefix to the error message, so we need to filter it out in order
         * to parse the JSON object.
         *
         * e.g. "Error occurred in handler for 'MenuBar:runCli': Error: {message:'Error: Command failed: expo start'}"
         */
        const filteredErrorMessage = error.message.substring(error.message.indexOf('Error:') + 7);

        throw new Error(filteredErrorMessage);
      }
      throw error;
    }
  },
} as typeof MenuBar;
