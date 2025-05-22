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
    const isLeft = distanceToLeft < distanceToRight;

    // Determine closest vertical edge
    const trayCenterY = trayBounds.y + trayBounds.height / 2;
    const distanceToTop = trayCenterY - workArea.y;
    const distanceToBottom = workArea.y + workArea.height - trayCenterY;
    const isTop = distanceToTop < distanceToBottom;

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
  rightClickMenu = () => {
    const menu: MenuItemConstructorOptions[] = [
      {
        label: 'Settings...',
        click() {
          WindowManager.openWindow('Settings', {
            // Keep in sync with menu-bar/src/windows/index.ts
            title: 'Settings',
            windowStyle: {
              titlebarAppearsTransparent: true,
              height: 580,
              width: 500,
            },
          });
        },
      },
      {
        role: 'quit',
        accelerator: 'Command+Q',
      },
    ];
    this.tray?.popUpContextMenu(Menu.buildFromTemplate(menu));
  };
  createTray = () => {
    this.tray = new Tray(getIconPath());
    nativeTheme.addListener('updated', () => {
      this.tray?.setImage(getIconPath());
    });

    this.tray.setIgnoreDoubleClickEvents(true);
    this.tray.on('click', this.toggleWindow);
    this.tray.on('right-click', this.rightClickMenu);

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
