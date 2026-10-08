import { InternalError } from 'common-types';
import { Platform } from 'common-types/build/cli-commands';
import util from 'util';

/**
 * Markers that delimit the payload in the legacy menu bar protocol. The app splits the CLI's output
 * on these (see `modules/menu-bar/electron/spawnCliAsync.ts` and `ios/CLIOutputParser.swift`), so
 * they have to stay byte-identical.
 */
const RETURN_OUTPUT_MARKER = '---- return output ----';
const THROWN_ERROR_MARKER = '---- thrown error ----';

/** Reported for anything that isn't an `InternalError`, so `code` is never absent in JSON mode. */
const UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR';

export type OutputMode =
  /** Colorized `util.inspect`, for a human at a terminal. */
  | 'human'
  /** One JSON value on stdout, JSON errors on stderr. The contract for scripts and agents. */
  | 'json'
  /** The marker-delimited protocol the menu bar parses. */
  | 'menu-bar';

function isEnvFlagEnabled(value: string | undefined): boolean {
  const normalized = value?.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

// Intentionally avoid importing `Env` from `eas-shared` here: that package is a barrel that pulls
// in the entire device/build toolchain. Since this module is loaded on every CLI invocation, a
// local check keeps startup cheap for commands that don't otherwise need `eas-shared`.
function isMenuBar(): boolean {
  return isEnvFlagEnabled(process.env.EXPO_MENU_BAR);
}

let jsonOutputRequested = false;

/** Set from the global `--json` flag in `index.ts`, before the command's action runs. */
export function setJsonOutput(enabled: boolean): void {
  jsonOutputRequested = enabled;
}

export function resolveOutputMode(): OutputMode {
  // `EXPO_MENU_BAR` wins. It means the menu bar spawned us and is parsing the marker protocol
  // above, and because it spawns the CLI with the user's environment inherited, an
  // `EXPO_ORBIT_JSON` exported in a shell profile must not change what the app receives.
  if (isMenuBar()) {
    return 'menu-bar';
  }
  if (jsonOutputRequested || isEnvFlagEnabled(process.env.EXPO_ORBIT_JSON)) {
    return 'json';
  }
  return 'human';
}

type SerializedError = {
  name: string;
  code?: string;
  message: string;
  details?: unknown;
  stack?: string;
};

/**
 * The shape the menu bar has always received: `code` and `details` appear only for `InternalError`.
 * Frozen for compatibility — new consumers get {@link serializeError} instead.
 */
function serializeErrorForMenuBar(error: Error): SerializedError {
  if (error instanceof InternalError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack,
    };
  }

  return { name: error.name, message: error.message, stack: error.stack };
}

/**
 * `code` is always populated here so a caller can branch on it without first sniffing the shape of
 * the error. `InternalError` codes are a closed set (see `common-types/src/InternalError.ts`) and
 * several of them are directly actionable, e.g. `TOOL_CHECK_FAILED` or
 * `APPLE_DEVICE_USBMUXD_NOT_RUNNING`.
 */
function serializeError(error: unknown): SerializedError {
  if (error instanceof InternalError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      code: UNKNOWN_ERROR_CODE,
      message: error.message,
      stack: error.stack,
    };
  }

  return { name: 'Error', code: UNKNOWN_ERROR_CODE, message: String(error) };
}

/**
 * Commands report progress through `console.log` — both directly and via `eas-shared`'s `Log`,
 * whose every level funnels into it. In JSON mode stdout has to carry exactly one JSON value, so
 * that chatter moves to stderr for the duration of the command instead of corrupting the payload.
 *
 * @returns a function that puts the original `console` methods back.
 */
function redirectConsoleLogToStderr(): () => void {
  /* eslint-disable no-console */
  const original = { log: console.log, info: console.info, debug: console.debug };
  const writeToStderr = (...args: any[]): void => console.error(...args);

  console.log = writeToStderr;
  console.info = writeToStderr;
  console.debug = writeToStderr;

  return () => {
    console.log = original.log;
    console.info = original.info;
    console.debug = original.debug;
  };
  /* eslint-enable no-console */
}

function writeSuccess(result: unknown, mode: OutputMode): void {
  if (mode === 'menu-bar') {
    console.log(RETURN_OUTPUT_MARKER);
    if (typeof result === 'string') {
      console.log(result);
    } else if (typeof result === 'object' && result !== null) {
      console.log(JSON.stringify(result));
    } else {
      console.log(util.inspect(result, { showHidden: false, depth: null, colors: false }));
    }
    return;
  }

  if (mode === 'json') {
    // Always one valid JSON value, including for the commands that return a bare string or nothing
    // at all — `undefined` has no JSON representation, so it is reported as `null`.
    process.stdout.write(`${JSON.stringify(result ?? null)}\n`);
    return;
  }

  console.log(util.inspect(result, { showHidden: false, depth: null, colors: true }));
}

function writeFailure(error: unknown, mode: OutputMode): void {
  if (mode === 'menu-bar') {
    console.log(THROWN_ERROR_MARKER);
    if (error instanceof Error) {
      console.log(JSON.stringify(serializeErrorForMenuBar(error)));
    } else {
      console.log(error);
    }
    return;
  }

  if (mode === 'json') {
    process.stderr.write(`${JSON.stringify(serializeError(error))}\n`);
    return;
  }

  const { code, message, stack } = serializeError(error);
  console.error(code === UNKNOWN_ERROR_CODE ? `Error: ${message}` : `Error [${code}]: ${message}`);
  if (stack && isEnvFlagEnabled(process.env.EXPO_DEBUG)) {
    console.error(stack);
  }
}

export function returnLoggerMiddleware(fn: (...args: any[]) => any | Promise<any>) {
  return async function (...args: any[]) {
    const mode = resolveOutputMode();
    const restoreConsole = mode === 'json' ? redirectConsoleLogToStderr() : undefined;

    let result: unknown;
    try {
      result = await fn(...args);
    } catch (error) {
      restoreConsole?.();
      writeFailure(error, mode);
      // Failures used to leave the exit code at 0, which meant a caller could not tell a failed
      // install from a successful one without parsing stdout. Set it rather than calling
      // `process.exit`, so buffered stdout/stderr still flush.
      process.exitCode = 1;
      return;
    }

    restoreConsole?.();
    writeSuccess(result, mode);
  };
}

export const getPlatformFromURI = (uri: string) => {
  if (uri.endsWith('.apk')) {
    return Platform.Android;
  }

  return Platform.Ios;
};
