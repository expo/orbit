import { contextBridge, ipcRenderer } from 'electron';
import { exposeElectronModules } from 'react-native-electron-modules';

import { PreloadModules } from '../modules/preloadRegistry';

contextBridge.exposeInMainWorld('electron', exposeElectronModules(PreloadModules, ipcRenderer));
