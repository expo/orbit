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
        this.logger.info(`New version has been downloaded from ${buildInfo.url} `);
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

    // @ts-ignore
    app.off('will-quit', this.quitAndInstall);

    const updateScript = `
      if [ "\${RESTART_REQUIRED}" = 'true' ]; then
        cp -f "\${UPDATE_FILE}" "\${APP_IMAGE}"
        (exec "\${APP_IMAGE}") & disown $!
      else
        (sleep 2 && cp -f "\${UPDATE_FILE}" "\${APP_IMAGE}") & disown $!
      fi
      kill "\${OLD_PID}" $(ps -h --ppid "\${OLD_PID}" -o pid)
      rm "\${UPDATE_FILE}"
    `;

    const proc = spawn('/bin/bash', ['-c', updateScript], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        APP_IMAGE: this.getAppImagePath(),
        // @ts-ignore
        OLD_PID: process.pid,
        RESTART_REQUIRED: String(restartRequired),
        UPDATE_FILE: this.lastUpdatePath,
      },
    });
    // @ts-ignore
    proc.unref();

    if (restartRequired === true) {
      quit();
      process.exit();
    }
  }

  async downloadUpdateFile(buildInfo: BuildInfo) {
    this.lastUpdatePath = this.getUpdatePath(buildInfo.sha256 || uuidv4());

    if (!fs.existsSync(this.lastUpdatePath)) {
      await this.httpClient.downloadFile(buildInfo.url, this.lastUpdatePath);
      await setExecFlag(this.lastUpdatePath);
    }

    if (buildInfo.sha256) {
      try {
        await this.checkHash(buildInfo.sha256, this.lastUpdatePath);
      } catch (e) {
        await fs.promises.unlink(this.lastUpdatePath);
        throw e;
      }
    }

    // @ts-ignore
    app.on('will-quit', this.quitAndInstall);

    return this.lastUpdatePath;
  }

  getAppImagePath() {
    const appImagePath = process.env.APPIMAGE;

    if (!appImagePath) {
      throw new Error('It seems that the app is not in AppImage format');
    }

    return appImagePath;
  }

  getUpdatePath(id: string) {
    const fileName = `${app.getName()}-${id}.AppImage`;
    return path.join(os.tmpdir(), fileName);
  }

  async checkHash(hash: string, filePath: string) {
    const fileHash = await calcSha256Hash(filePath);
    if (fileHash !== hash) {
      throw new Error(`Update is corrupted. Expected hash: ${hash}, actual: ${fileHash}`);
    }
  }
}

async function setExecFlag(filePath: string) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, fs.constants.X_OK, (err) => {
      if (!err) {
        return resolve(filePath);
      }

      fs.chmod(filePath, '0755', (e) => {
        if (e) {
          reject(new Error(`Cannot chmod of ${filePath}`));
        } else {
          resolve(filePath);
        }
      });
    });
  });
}
