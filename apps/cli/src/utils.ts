import { InternalError } from 'common-types';
import { Platform } from 'common-types/build/cli-commands';
import { Env } from 'eas-shared';
import util from 'util';
import picomatch from 'picomatch';
import { getTrustedSources } from './storage';

export function returnLoggerMiddleware(fn: (...args: any[]) => any | Promise<any>) {
  return async function (...args: any[]) {
    try {
      const result = await fn(...args);
      if (Env.isMenuBar()) {
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
      if (error instanceof InternalError) {
        console.log(
          JSON.stringify({
            name: error.name,
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

export const trustedSourcesValidatorMiddleware = (fn: (...args: any[]) => any | Promise<any>) => {
  return async function (...args: any[]) {
    const urls = args.filter((arg) => typeof arg === 'string' && arg.startsWith('http'));
    if (!urls) {
      return fn(...args);
    }

    const trustedSources = getTrustedSources();
    if (!trustedSources) {
      return fn(...args);
    }

    for (const url of urls) {
      if (!trustedSources.some((source) => picomatch(source)(url))) {
        throw new Error(`This URL is from an untrusted source: ${url}`);
      }
    }

    return fn(...args);
  };
};

export const getPlatformFromURI = (uri: string) => {
  if (uri.endsWith('.apk')) {
    return Platform.Android;
  }

  return Platform.Ios;
};
