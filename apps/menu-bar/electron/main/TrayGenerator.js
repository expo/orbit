const { Tray, Menu, screen } = require('electron');
const path = require('path');

class TrayGenerator {
  constructor(mainWindow) {
    this.tray = null;
    this.mainWindow = mainWindow;
  }
  getWindowPosition = () => {
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
    this.mainWindow.setPosition(position.x, position.y, false);
    this.mainWindow.show();
  };
  toggleWindow = () => {
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  };
  rightClickMenu = () => {
    const menu = [
      {
        role: 'quit',
        accelerator: 'Command+Q',
      },
    ];
    this.tray.popUpContextMenu(Menu.buildFromTemplate(menu));
  };
  createTray = () => {
    // eslint-disable-next-line no-undef
    this.tray = new Tray(path.join(__dirname, '../assets/images/icon.png'));

    this.tray.setIgnoreDoubleClickEvents(true);
    this.tray.on('click', this.toggleWindow);
    this.tray.on('right-click', this.rightClickMenu);
  };
}
module.exports = TrayGenerator;
