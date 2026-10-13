// Emitted by the native window manager with the closing window's module name
// (macOS: `windowWillClose:` in WindowNavigator.m; Electron: the BrowserWindow
// `close` event). It is the only close signal that works on Electron, where a
// closing renderer runs no React effect cleanup.
export const WINDOW_CLOSED_EVENT = 'windowClosed';
