// Static import (rather than a conditional dynamic import) because Electron
// finalizes the preload script synchronously: as soon as preload.ts's
// top-level code returns, the renderer starts loading. A dynamic import
// returns a Promise that may not settle before then, so the
// `contextBridge.exposeInMainWorld('wdioElectron', ...)` side effect can
// race the renderer — works on Windows by luck, fails on Linux under
// xvfb-run. The exposed `wdioElectron` global is harmless without the
// main-process handler (it just makes IPC calls that go unanswered), so
// keeping it in production builds is a ~250-byte no-op.
import 'wdio-electron-service/preload';
import { exposeElectronModules } from 'react-native-electron-modules';

import { PreloadModules } from '../modules/preloadRegistry';

exposeElectronModules(PreloadModules);
