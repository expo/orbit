import { autoUpdater } from 'electron';

import HttpClient from '../utils/HttpClient';
import Logger from '../utils/Logger';
import { BuildInfo } from '../utils/meta';
import { Options } from '../utils/options';

export default class Platform {
  emit: any;
  options: Options;
  logger: Logger;
  httpClient: HttpClient;

  constructor(options: Options, logger: Logger, emit: Function, httpClient: HttpClient) {
    this.emit = emit;
    this.options = options;
    this.logger = logger;
    this.httpClient = httpClient;
  }

  init() {
    // Empty by default
  }

  downloadUpdate(buildInfo: BuildInfo) {
    autoUpdater.setFeedURL({ url: buildInfo.url });
    autoUpdater.checkForUpdates();
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }
}
