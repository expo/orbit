import {
  Tray,
  Menu,
  screen,
  BrowserWindow,
  MenuItemConstructorOptions,
  ipcMain,
  app,
  nativeTheme,
} from 'electron';
import path from 'path';

export default class TrayGenerator {
  mainWindow: BrowserWindow;
  tray: Tray | null;

  constructor(mainWindow: BrowserWindow) {
    this.tray = null;
    this.mainWindow = mainWindow;
  }
  getWindowPosition = () => {
    if (this.tray === null) {
      return;
    }
    const windowBounds = this.mainWindow.getBounds();
    const trayBounds = this.tray.getBounds();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    const x = Math.round(width - windowBounds.width - 12);
    const y = Math.round(trayBounds.y - windowBounds.height - 12);
    return { x, y };
  };
  showWindow = () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { height, width } = primaryDisplay.size;
    this.mainWindow.webContents.send('popoverFocused', { screenSize: { height, width } });
    const position = this.getWindowPosition();

    if (!position) {
      return;
    }
    this.mainWindow.setPosition(position.x, position.y, false);
    this.mainWindow.show();
  };
  hideWindow = () => {
    this.mainWindow.hide();
  };
  toggleWindow = () => {
    if (this.mainWindow.isVisible()) {
      this.hideWindow();
    } else {
      this.showWindow();
    }
  };
  rightClickMenu = () => {
    const menu: MenuItemConstructorOptions[] = [
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

    ipcMain.handle('open-popover', this.showWindow);
    ipcMain.handle('close-popover', this.hideWindow);

    app.on('open-url', this.showWindow);
    app.on('second-instance', this.showWindow);

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
  return path.join(__dirname, `../../assets/images/tray/${iconName}`);
};

const getIconName = () => {
  if (process.platform === 'darwin') {
    return 'icon.png';
  }

  return `icon-${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}.${
    process.platform === 'win32' ? 'ico' : 'png'
  }`;
};
