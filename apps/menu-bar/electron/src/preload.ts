import { contextBridge, ipcRenderer } from 'electron';

import { requirePreloadModules } from '../modules/requirePreloadModules';

contextBridge.exposeInMainWorld('electron', requirePreloadModules(ipcRenderer));
