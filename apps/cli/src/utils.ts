import { Platform } from 'common-types/build/cli-commands';
import util from 'util';

// Intentionally avoid importing `Env` from `eas-shared` here: that package is a barrel that pulls
// in the entire device/build toolchain. Since this module is loaded on every CLI invocation, a
// local check keeps startup cheap for commands that don't otherwise need `eas-shared`.
function isMenuBar(): boolean {
  const value = process.env.EXPO_MENU_BAR?.toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

type InternalErrorLike = Error & { code: string; details?: unknown };

// Both common-types' and apple-resign's InternalError set `name = 'InternalError'`
// and carry a string `code`. Match on that shape so either class serializes with
// its `code`/`details` intact, while plain errors carrying an unrelated `code`
// (e.g. Node's `ENOENT`) are left to the generic Error branch.
function isInternalErrorLike(error: unknown): error is InternalErrorLike {
  return (
    error instanceof Error &&
    error.name === 'InternalError' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

export function returnLoggerMiddleware(fn: (...args: any[]) => any | Promise<any>) {
  return async function (...args: any[]) {
    try {
      const result = await fn(...args);
      if (isMenuBar()) {
        console.log('---- return output ----');
        if (typeof result === 'string') {
          console.log(result);
        } else if (typeof result === 'object' && result !== null) {
          console.log(JSON.stringify(result));
        } else {
          console.log(
            util.inspect(result, {
              showHidden: false,
              depth: null,
              colors: false,
            })
          );
        }
        return;
      }

      return console.log(
        util.inspect(result, {
          showHidden: false,
          depth: null,
          colors: true,
        })
      );
    } catch (error) {
      console.log('---- thrown error ----');
      // Detect InternalError structurally rather than with `instanceof`: some
      // dependencies (e.g. apple-resign) ship their own binary-compatible
      // InternalError class, so a strict `instanceof` against common-types'
      // class misses those and would drop `code`/`details` on serialization.
      if (isInternalErrorLike(error)) {
        console.log(
          JSON.stringify({
            name: 'InternalError',
            code: error.code,
            message: error.message,
            details: error.details,
            stack: error.stack,
          })
        );
      } else if (error instanceof Error) {
        console.log(
          JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack,
          })
        );
      } else {
        console.log(error);
      }
    }
  };
}

export const getPlatformFromURI = (uri: string) => {
  if (uri.endsWith('.apk')) {
    return Platform.Android;
  }

  return Platform.Ios;
};
