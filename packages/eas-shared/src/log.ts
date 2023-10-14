import chalk from 'chalk';
import { boolish } from 'getenv';
import logSymbols from 'log-symbols';

type Color = (...text: string[]) => string;

export default class Log {
  public static readonly isDebug = boolish('EXPO_DEBUG', false);

  public static log(...args: any[]): void {
    Log.consoleLog(...args);
  }

  public static newLine(): void {
    Log.consoleLog();
  }

  public static addNewLineIfNone(): void {
    if (!Log.isLastLineNewLine) {
      Log.newLine();
    }
  }

  public static error(...args: any[]): void {
    Log.consoleLog(...Log.withTextColor(args, chalk.red));
  }

  public static warn(...args: any[]): void {
    Log.consoleLog(...Log.withTextColor(args, chalk.yellow));
  }

  public static debug(...args: any[]): void {
    if (Log.isDebug) {
      Log.consoleLog(...args);
    }
  }

  public static gray(...args: any[]): void {
    Log.consoleLog(...Log.withTextColor(args, chalk.gray));
  }

  public static warnDeprecatedFlag(flag: string, message: string): void {
    Log.warn(`› ${chalk.bold('--' + flag)} flag is deprecated. ${message}`);
  }

  public static fail(message: string): void {
    Log.log(`${chalk.red(logSymbols.error)} ${message}`);
  }

  public static succeed(message: string): void {
    Log.log(`${chalk.green(logSymbols.success)} ${message}`);
  }

  private static consoleLog(...args: any[]): void {
    Log.updateIsLastLineNewLine(args);
    // eslint-disable-next-line no-console
    console.log(...args);
  }

  private static withTextColor(args: any[], chalkColor: Color): string[] {
    return args.map((arg) => chalkColor(arg));
  }

  private static isLastLineNewLine = false;
  private static updateIsLastLineNewLine(args: any[]): void {
    if (args.length === 0) {
      Log.isLastLineNewLine = true;
    } else {
      const lastArg = args[args.length - 1];
      if (typeof lastArg === 'string' && (lastArg === '' || lastArg.match(/[\r\n]$/))) {
        Log.isLastLineNewLine = true;
      } else {
        Log.isLastLineNewLine = false;
      }
    }
  }
}

export function log(...message: string[]): void {
  console.log(...message);
}

export function error(...message: string[]): void {
  console.error(...message);
}

/** Print an error and provide additional info (the stack trace) in debug mode. */
export function exception(e: Error): void {
  error(chalk.red(e.toString()) + ('\n' + chalk.gray(e.stack)));
}

/** Log a message and exit the current process. If the `code` is non-zero then `console.error` will be used instead of `console.log`. */
export function exit(message: string | Error, code: number = 1): never {
  if (message instanceof Error) {
    exception(message);
    process.exit(code);
  }

  if (message) {
    if (code === 0) {
      log(message);
    } else {
      error(message);
    }
  }

  process.exit(code);
}
