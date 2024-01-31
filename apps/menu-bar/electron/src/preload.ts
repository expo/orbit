import { exposeElectronModules } from 'react-native-electron-modules';

import { PreloadModules } from '../modules/preloadRegistry';

exposeElectronModules(PreloadModules);
