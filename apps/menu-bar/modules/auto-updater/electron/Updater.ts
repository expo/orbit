import { BrowserWindow, ipcMain, app, autoUpdater, dialog } from 'electron';
import Store from 'electron-store';
import { EventEmitter } from 'events';
import path from 'path';

import { createPlatform } from './platform';
import Platform from './platform/Platform';
import HttpClient from './utils/HttpClient';
import Logger from './utils/Logger';
import {
  BuildInfo,
  VersionMeta,
  extractBuildInfoFromMeta,
  getNewerVersion,
  getUpdatesMeta,
} from './utils/meta';
import { Options, getOptions } from './utils/options';

type StoreOptions = {
  autoCheckUpdates: boolean;
  skipVersion: string;
};

const store = new Store<StoreOptions>({ name: 'auto-updater' });

// Based on https://github.com/megahertz/electron-simple-updater
export default class Updater extends EventEmitter {
  options: Options;
  logger: Logger;
  meta?: VersionMeta;
  buildInfo?: BuildInfo;
  httpClient: HttpClient;
  platform: Platform;
  window?: BrowserWindow;

  constructor() {
    super();

    this.init = this.init.bind(this);
    this.checkForUpdates = this.checkForUpdates.bind(this);
    this.downloadUpdate = this.downloadUpdate.bind(this);
    this.quitAndInstall = this.quitAndInstall.bind(this);
    this.setOptions = this.setOptions.bind(this);
    this.getFeedURL = this.getFeedURL.bind(this);

    this.options = getOptions();

    this.logger = new Logger(this.options);

    this.httpClient = new HttpClient(this.options);

    this.platform = createPlatform(
      this.options,
      this.logger,
      this.emit.bind(this),
      this.httpClient
    );

    autoUpdater.on('update-downloaded', () => {
      const version = this.meta?.version;
      this.logger.info(`New version ${version} has been downloaded`);
      this.emit('update-downloaded', this.meta);
    });

    this.on('error', this.logger.warn);
    autoUpdater.on('error', (e) => {
      if (this.window) {
        this.window.close();
      }
      dialog.showMessageBox({
        message: 'Something went wrong while installing the update.',
        detail: 'Please try again.',
      });
      this.emit('error', e);
    });
  }

  /**
   * Initialize updater module
   * @param {Partial<Options> | string} options
   * @return {this}
   */
  init(options: Partial<Options> = {}): this {
    if (options.logger) {
      this.options.setOptions('logger', options.logger);
    }

    if (!app.isPackaged) {
      this.logger.info('Update is disabled because the app is not packaged');
      return this;
    }

    if (!this.options.initialize(options, this.logger)) {
      this.logger.warn('Update is disabled because of wrong configuration');
    }

    this.platform.init();
    this.setupWindowFunctions();

    if (this.getAutomaticallyChecksForUpdates()) {
      this.checkForUpdates({ silent: true });
    }

    return this;
  }

  /**
   * Asks the server whether there is an update. url must be set before
   */
  checkForUpdates({ silent }: { silent?: boolean } = {}): this {
    const opt = this.options;
    if (!opt.url) {
      this.emit('error', 'You must set url before calling checkForUpdates()');
      return this;
    }

    this.emit('checking-for-update');
    getUpdatesMeta(this.httpClient, opt.url)
      .then((updates) => {
        const update = getNewerVersion(updates, opt.version);
        if (!update) {
          if (!silent) {
            dialog.showMessageBox({
              message: 'You are up to date!',
              detail: `${app.getName()} is already running the newest version available. (You are currently running version ${
                opt.version
              }.)`,
            });
          }
          return;
        }

        this.onFoundUpdate(update);
      })
      .catch((e) => {
        this.emit('update-not-available');
        this.emit('error', e);
      });

    return this;
  }

  /**
   * Start downloading update manually.
   * You can use this method if autoDownload option is set to false
   * @return {this}
   */
  downloadUpdate(): this {
    if (!this.buildInfo?.url) {
      this.emit('error', 'No metadata for update. Run checkForUpdates first.');
      return this;
    }

    this.window = new BrowserWindow({
      width: 400,
      height: 100,
    });
    this.window
      .loadFile('../modules/auto-updater/electron/screens/downloading-update/index.html')
      .then(async () => {
        this.window?.show();
      });

    this.emit('update-downloading', this.buildInfo);
    this.logger.info(`Downloading updates from ${this.buildInfo.url}`);

    this.platform.downloadUpdate(this.buildInfo);

    return this;
  }

  /**
   * Restarts the app and installs the update after it has been downloaded.
   * It should only be called after update-downloaded has been emitted.
   * @return {void}
   */
  quitAndInstall(): void {
    this.platform.quitAndInstall();
  }

  setOptions(
    name: keyof Options | Partial<Options>,
    value: Options[keyof Options] = undefined
  ): this {
    this.options.setOptions(name, value);
    return this;
  }

  get build() {
    if (!this.checkIsInitialized()) return;
    return this.options.build;
  }

  /**
   * Return a build name with version
   * @return {string}
   */
  get buildId(): string {
    if (!this.checkIsInitialized()) return '';
    return `${this.build}-v${this.version}`;
  }

  get version() {
    if (!this.checkIsInitialized()) return;
    return this.options.version;
  }

  /**
   * Return the current updates.json URL
   * @return {string}
   */
  getFeedURL(): string {
    if (!this.checkIsInitialized()) return '';
    return this.options.url;
  }

  setupWindowFunctions() {
    ipcMain.handle('autoUpdater:skipVersion', () => {
      store.set('skipVersion', this.meta?.version);
      this.window?.close();
    });

    ipcMain.handle('autoUpdater:rememberLater', () => {
      this.window?.close();
    });

    ipcMain.handle('autoUpdater:installUpdate', () => {
      this.window?.close();
      this.downloadUpdate();
    });
  }

  /**
   * Called when updates metadata has been downloaded
   */
  onFoundUpdate(meta: VersionMeta) {
    this.meta = meta;

    const buildInfo = extractBuildInfoFromMeta(meta, this.options.build);
    if (!buildInfo) {
      this.logger.debug(`Update ${meta.version} for ${this.buildId} is not available`);
      return;
    }
    this.buildInfo = buildInfo;

    this.logger.debug(`Found version ${meta.version} at ${buildInfo.url}`);
    this.emit('update-available', meta);

    // Create window with update information
    this.window = new BrowserWindow({
      width: 520,
      height: 400,
      webPreferences: {
        preload: path.join(
          __dirname,
          '../../../modules/auto-updater/electron/screens/update-available/preload.js'
        ),
      },
    });
    this.window
      .loadFile('../modules/auto-updater/electron/screens/update-available/index.html')
      .then(async () => {
        this.window?.webContents.send('autoUpdater:sendInfo', {
          appName: app.getName(),
          newVersion: meta.version,
          releaseNotes: meta.release_notes,
          currentVersion: this.options.version,
        });
        this.window?.show();
      });

    if (this.options.autoDownload && meta.version !== store.get('skipVersion')) {
      this.downloadUpdate();
    }
  }

  checkIsInitialized(): boolean {
    if (!this.options.isInitialized) {
      this.emit('error', new Error('Not initialized'));
      return false;
    }

    return true;
  }

  getAutomaticallyChecksForUpdates() {
    return store.get('autoCheckUpdates', false);
  }

  setAutomaticallyChecksForUpdates(value: boolean) {
    store.set('autoCheckUpdates', value);
  }
}
