import { spawn } from 'child_process';
import { app } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import Platform from './Platform';
import HttpClient from '../utils/HttpClient';
import Logger from '../utils/Logger';
import { calcSha256Hash } from '../utils/file';
import { BuildInfo } from '../utils/meta';
import { Options } from '../utils/options';
import { quit } from '../utils/quit';

export default class Linux extends Platform {
  lastUpdatePath: string | null;
  meta: any;

  constructor(options: Options, logger: Logger, emit: any, httpClient: HttpClient) {
    super(options, logger, emit, httpClient);

    this.quitAndInstall = this.quitAndInstall.bind(this);
    this.lastUpdatePath = null;
  }

  downloadUpdate(buildInfo: BuildInfo) {
    this.downloadUpdateFile(buildInfo)
      .then(() => {
        this.logger.info(`New version has been downloaded from ${buildInfo.url}`);
        this.emit('update-downloaded', this.meta);
      })
      .catch((e) => this.emit('error', e));
  }

  /**
   * @param {boolean} restartRequired
   */
  quitAndInstall(restartRequired = true) {
    if (!this.lastUpdatePath) {
      return;
    }

    const fileExtension = path.extname(this.lastUpdatePath);
    const installCommand =
      fileExtension === '.deb'
        ? `dpkg -i "${this.lastUpdatePath}"`
        : fileExtension === '.rpm'
          ? `rpm -i --force "${this.lastUpdatePath}"`
          : null;

    if (!installCommand) {
      throw new Error('Unsupported package format. Only .deb and .rpm are supported.');
    }

    const proc = spawn('/bin/bash', ['-c', installCommand], {
      detached: true,
      stdio: 'ignore',
    });

    proc.on('exit', (code) => {
      if (code !== 0) {
        this.logger.error(`Installation process failed with code ${code}`);
        return;
      }
      this.logger.info('Update installed successfully.');
      if (restartRequired) {
        quit();
        process.exit();
      }
    });

    proc.unref();
  }

  async downloadUpdateFile(buildInfo: BuildInfo) {
    const fileExtension = buildInfo.url.endsWith('.deb') ? '.deb' : '.rpm';
    const fileName = `${app.getName()}-${uuidv4()}${fileExtension}`;
    this.lastUpdatePath = path.join(os.tmpdir(), fileName);

    if (!fs.existsSync(this.lastUpdatePath)) {
      await this.httpClient.downloadFile(buildInfo.url, this.lastUpdatePath);
    }

    if (buildInfo.sha256) {
      try {
        await this.checkHash(buildInfo.sha256, this.lastUpdatePath);
      } catch (e) {
        await fs.promises.unlink(this.lastUpdatePath);
        throw e;
      }
    }

    return this.lastUpdatePath;
  }

  async checkHash(hash: string, filePath: string) {
    const fileHash = await calcSha256Hash(filePath);
    if (fileHash !== hash) {
      throw new Error(`Update is corrupted. Expected hash: ${hash}, actual: ${fileHash}`);
    }
  }
}
