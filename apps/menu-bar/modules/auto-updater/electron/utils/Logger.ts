import { Options } from './options';

const PREFIX = '[Updater]';

export default class Logger {
  options: Partial<Options>;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;

  constructor(options: Partial<Options>) {
    this.options = options;

    this.error = this.log.bind(this, 'error');
    this.warn = this.log.bind(this, 'warn');
    this.info = this.log.bind(this, 'info');
    this.debug = this.log.bind(this, 'debug');
  }

  log(level: Exclude<keyof Logger, 'log'>, ...args: any[]) {
    const customLogger = this.options.logger;
    const logger = customLogger?.[level];

    if (!logger || typeof logger !== 'function') {
      return;
    }

    logger(PREFIX, ...args);
  }

  static createEmpty() {
    return new Logger({});
  }
}
