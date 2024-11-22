import { execSync } from 'child_process';
import { app } from 'electron';

import Logger from './Logger';
import { readPackageJson } from './file';

export function getOptions() {
  return new Options();
}

export class Options {
  autoDownload: boolean;
  build: string;
  http: { headers?: Record<string, string | number | boolean> };
  version: string;
  url: string;
  logger: Partial<Logger>;
  isInitialized: boolean;
  appPath: string | undefined;

  constructor() {
    this.autoDownload = false;
    this.build = this.makeBuildString(process as unknown as NodeJS.Process);
    this.http = {};
    this.version = '';
    this.url = '';
    this.logger = console;
    this.isInitialized = false;
    this.appPath = undefined;
  }

  setOptions(
    nameOrOptions: keyof Options | Partial<Options>,
    value: Options[keyof Options] = undefined
  ) {
    if (typeof nameOrOptions === 'object') {
      Object.entries(nameOrOptions).forEach((entry) => {
        const [optName, optValue] = entry as [keyof Options, Options[keyof Options]];
        this.setOptions(optName, optValue);
      });
      return;
    }

    const name = nameOrOptions;

    if (value === undefined) {
      return;
    }

    // @ts-ignore
    this[name] = value;
  }

  initialize(options: Partial<Options>, logger: Logger): boolean {
    if (this.isInitialized) {
      logger.error('It has been initialized before');
      return false;
    }

    this.version = app.getVersion();
    this.loadOptionsFromPackage(options.appPath);

    this.setOptions(options);

    if (!this.validate(logger)) {
      return false;
    }

    this.isInitialized = true;

    return true;
  }

  loadOptionsFromPackage(appPath?: string) {
    const packageJson = readPackageJson(appPath);
    const options = packageJson.updater || {};

    options.version = packageJson.version;
    this.setOptions(options);
  }

  makeBuildString(process: NodeJS.Process): string {
    let build: NodeJS.Platform | 'mas' | 'winstore' | 'linux-rpm' | 'linux-deb' | 'linux-unknown' =
      process.platform;

    if (process.mas) {
      build = 'mas';
    } else if (process.windowsStore) {
      build = 'winstore';
    }
    if (build === 'linux') {
      const packageType = getLinuxPackageType();
      build = `linux-${packageType}`;
    }

    return `${build}-${process.arch}`;
  }

  validate(logger: Logger): boolean {
    if (!this.url) {
      logger.warn(
        'You must set an url parameter in package.json (updater.url) or ' +
          'when calling init({ url })'
      );
      return false;
    }

    if (!this.version) {
      logger.warn('Set version in a package.json or when calling init()');
      return false;
    }

    return true;
  }
}

function getLinuxPackageType() {
  try {
    // Check for dpkg (used for .deb packages)
    execSync('command -v dpkg', { stdio: 'ignore' });
    return 'deb';
  } catch {
    // dpkg not found, check for rpm
    try {
      execSync('command -v rpm', { stdio: 'ignore' });
      return 'rpm';
    } catch {
      return 'unknown';
    }
  }
}
