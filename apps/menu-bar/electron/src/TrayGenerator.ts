import {
  Tray,
  Menu,
  screen,
  BrowserWindow,
  MenuItemConstructorOptions,
  ipcMain,
  app,
  nativeTheme,
  Rectangle,
  Display,
} from 'electron';
import path from 'path';

import WindowManager from '../modules/WindowManager/main';

export default class TrayGenerator {
  mainWindow: BrowserWindow;
  tray: Tray | null;

  constructor(mainWindow: BrowserWindow) {
    this.tray = null;
    this.mainWindow = mainWindow;
  }
  calculateWindowPosition = (display: Display) => {
    if (this.tray === null) {
      return;
    }
    const windowBounds = this.mainWindow.getBounds();
    const trayBounds = this.tray.getBounds();
    const { workArea } = display;
    const PADDING = 12;

    // Determine closest horizontal edge
    const trayCenterX = trayBounds.x + trayBounds.width / 2;
    const distanceToLeft = trayCenterX - workArea.x;
    const distanceToRight = workArea.x + workArea.width - trayCenterX;
    let isLeft = distanceToLeft < distanceToRight;

    // Determine closest vertical edge
    const trayCenterY = trayBounds.y + trayBounds.height / 2;
    const distanceToTop = trayCenterY - workArea.y;
    const distanceToBottom = workArea.y + workArea.height - trayCenterY;
    let isTop = distanceToTop < distanceToBottom;

    const zeroTray =
      trayBounds.x === 0 && trayBounds.y === 0 && trayBounds.width === 0 && trayBounds.height === 0;
    if (process.platform === 'linux' && zeroTray) {
      // On Linux trayBounds may return an empty Rectagle, in these cases force to top-right corner
      isTop = true;
      isLeft = false;
    }

    const x = isLeft
      ? workArea.x + PADDING
      : workArea.x + workArea.width - windowBounds.width - PADDING;

    const y = isTop
      ? workArea.y + PADDING
      : workArea.y + workArea.height - windowBounds.height - PADDING;

    return { x, y };
  };
  showWindow = (bounds?: Rectangle) => {
    const currentDisplay = bounds
      ? screen.getDisplayMatching(bounds)
      : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());

    const { height, width } = currentDisplay.size;
    this.mainWindow.webContents.send('popoverFocused', { screenSize: { height, width } });
    const position = this.calculateWindowPosition(currentDisplay);

    if (!position) {
      return;
    }
    this.mainWindow.setPosition(position.x, position.y, false);
    this.mainWindow.show();
  };
  hideWindow = () => {
    this.mainWindow.hide();
  };
  toggleWindow = (_: KeyboardEvent, bounds: Rectangle) => {
    if (this.mainWindow.isVisible()) {
      this.hideWindow();
    } else {
      this.showWindow(bounds);
    }
  };
  openSettings = () => {
    WindowManager.openWindow('Settings', {
      // Keep in sync with menu-bar/src/windows/index.ts
      title: 'Settings',
      windowStyle: {
        titlebarAppearsTransparent: true,
        height: 520,
        width: 680,
      },
    });
  };
  // The popover asks about running remote sessions before it exits. A popover that crashed
  // cannot ask, so the app quits directly.
  requestQuit = () => {
    const { webContents } = this.mainWindow;
    if (this.mainWindow.isDestroyed() || webContents.isCrashed()) {
      app.quit();
    } else {
      webContents.send('quitRequested', {});
    }
  };
  // The keyboard shortcuts of every window: Ctrl+, opens Settings, Ctrl+Q quits and Ctrl+W
  // closes the window (Command on macOS). The windows hide their menu bar, so the handler
  // gets the keys here and all platforms do the same thing.
  handleShortcuts = (window: BrowserWindow) => {
    window.webContents.on('before-input-event', (event, input) => {
      const modifier = process.platform === 'darwin' ? input.meta : input.control;
      if (input.type !== 'keyDown' || !modifier || input.alt || input.shift) {
        return;
      }
      const key = input.key.toLowerCase();
      if (key === ',') {
        event.preventDefault();
        this.openSettings();
      } else if (key === 'q') {
        event.preventDefault();
        this.requestQuit();
      } else if (key === 'w') {
        event.preventDefault();
        if (window === this.mainWindow) {
          this.hideWindow();
        } else {
          window.close();
        }
      }
    });
  };
  contextMenu = () => {
    const menu: MenuItemConstructorOptions[] = [
      {
        label: 'Settings...',
        // Shown as Ctrl+, on Windows and Linux, and as Command-comma on macOS.
        accelerator: 'CommandOrControl+,',
        click: this.openSettings,
      },
      {
        label: 'Quit',
        accelerator: 'CommandOrControl+Q',
        click: this.requestQuit,
      },
    ];
    return Menu.buildFromTemplate(menu);
  };
  createTray = () => {
    this.tray = new Tray(getIconPath());
    nativeTheme.addListener('updated', () => {
      this.tray?.setImage(getIconPath());
    });

    this.tray.setIgnoreDoubleClickEvents(true);
    this.tray.on('click', this.toggleWindow);
    // Electron emits `right-click` only on macOS and Windows. On Linux, the tray shows the menu
    // that `setContextMenu` sets.
    if (process.platform === 'linux') {
      this.tray.setContextMenu(this.contextMenu());
    } else {
      this.tray.on('right-click', () => this.tray?.popUpContextMenu(this.contextMenu()));
    }

    this.handleShortcuts(this.mainWindow);
    app.on('browser-window-created', (_, window) => this.handleShortcuts(window));

    ipcMain.handle('open-popover', () => this.showWindow());
    ipcMain.handle('close-popover', this.hideWindow);

    app.on('open-url', () => this.showWindow());
    app.on('second-instance', () => this.showWindow());

    this.mainWindow.on('blur', () => {
      if (!this.tray) {
        return;
      }

      const cursor = screen.getCursorScreenPoint();
      const trayBounds = this.tray.getBounds();
      if (
        cursor.x >= trayBounds.x &&
        cursor.x <= trayBounds.x + trayBounds.width &&
        cursor.y >= trayBounds.y &&
        cursor.y <= trayBounds.y + trayBounds.height
      ) {
        // Cursor is within tray bounds, do not hide
        return;
      }

      this.hideWindow();
    });
  };
}
module.exports = TrayGenerator;

const getIconPath = () => {
  const iconName = getIconName();

  return path.join(
    path.dirname(__dirname),
    `${app.isPackaged ? '../..' : '..'}/assets/images/tray/${iconName}`
  );
};

const getIconName = () => {
  if (process.platform === 'darwin' || process.platform === 'linux') {
    return 'icon.png';
  }

  return `icon-${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}.${
    process.platform === 'win32' ? 'ico' : 'png'
  }`;
};
