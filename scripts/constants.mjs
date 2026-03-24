import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(__dirname, '..');
export const MENU_BAR_PKG = resolve(ROOT, 'apps/menu-bar/package.json');
export const ELECTRON_PKG = resolve(ROOT, 'apps/menu-bar/electron/package.json');
export const INFO_PLIST = resolve(
  ROOT,
  'apps/menu-bar/macos/ExpoMenuBar-macOS/Info.plist'
);
export const CHANGELOG = resolve(ROOT, 'CHANGELOG.md');
export const APPCAST = resolve(ROOT, 'appcast.xml');
export const ELECTRON_UPDATES = resolve(ROOT, 'electron-updates.json');
export const GITHUB_REPO = 'https://github.com/expo/orbit';
